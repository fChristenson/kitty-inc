// Shoal, a floor crit: the number bursts into a shoal of hundreds of glitter
// specks led by a few wisps that streams round the whole building in one big
// loop, out past the bars' ends and back the other side, the loop tightening
// and quickening; each pass a wave peels off and darts into the nearest
// bar's readout, levelling it, the waves closing up; then the shoal balls up
// beside its own bar, whirling and trembling, and drives into it whole
import {
  diveRest,
  drawDives,
  drawSwarm,
  planDives,
  planSwarm,
  swarmAt,
  type Dives,
  type Swarm,
} from "../../../../shared/animationStyles/swarm";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { groundY, skyY } from "../../critPlayer/shared";

const TAU = Math.PI * 2;
const IN_MS = 130;
// the shoal: COUNT specks, LEADS of them wisps up front
const COUNT = 220;
const LEADS = 3;
const SPECK = 18;
const LEAD = WISP_SIZE * 1.1;
// its timeline: out of the number from START_MS onto the loop by LOOP_AT;
// TURNS laps over LOOP_MS, quickening from QUICK of its mean speed, shrinking
// to TIGHT; then GATHER_MS balling up and PACK_MS whirling before the drive
const START_MS = 60;
const LOOP_AT = 280;
const LOOP_MS = 1000;
const TURNS = 1.7;
const QUICK = 0.45;
const TIGHT = 0.8;
const GATHER_AT = LOOP_AT + LOOP_MS;
const GATHER_MS = 220;
const BALL_AT = GATHER_AT + GATHER_MS;
const PACK_MS = 200;
const CLIMAX = BALL_AT + PACK_MS;
// the loop: OUT px past the bars' ends (kept on screen), ABOVE/BELOW px past
// the top and lowest bars, at least MIN_RY tall either side of its middle
const OUT = 60;
const ABOVE = 150;
const BELOW = 150;
const MIN_RY = 200;
// the shoal's spread: BURST_R out of the number, LOOP_R over the loop, PACK
// as a ball; flattened SQUASH while streaming, BALL_SQUASH as a ball
const BURST_R = 30;
const LOOP_R: [number, number] = [120, 80];
const PACK = 36;
const SQUASH = 0.55;
const BALL_SQUASH = 0.9;
const SPIN_HZ: [number, number] = [0.5, 5];
const LAG_MS = 190;
// the ball: BESIDE px in from its readout, UP px over its bar, trembling
const BESIDE = 280;
const UP = 190;
const TREMBLE = 10;
// a readout: READ px in from its bar's right end
const READ = 120;
// the waves: the last WAVES_END of the way round, closing up by CLOSE; each
// WAVE_SPREAD_MS, WAVES_SHARE of the shoal in all; each FLIGHT_MS
const WAVES_END = 0.92;
const CLOSE = 1.6;
const WAVE_SPREAD_MS = 110;
const WAVES_SHARE = 0.5;
const FLIGHT_MS = 150;
const CLIMAX_SPREAD_MS = 70;
const BLAST = 160;
const OWN_BLAST = 460;
// shakes by step: a wave in, the whole shoal in
const SHAKES = [0.8, 3.4];

// the loop and the ball, from its own bar; live.own is that bar this frame
interface Loop {
  live: { own: Point };
  ox: number;
  oy: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  th0: number;
  bx: number;
  by: number;
}

const smooth = (u: number) => u * u * (3 - 2 * u);

// the shoal's head at ms: onto the loop, round it quickening and tightening,
// then swooping off it into the ball
function shoalAt(g: Loop, ms: number, into: Point): Point {
  const u = (ms - LOOP_AT) / LOOP_MS;
  const laps =
    u < 0
      ? QUICK * u
      : u <= 1
        ? QUICK * u + (1 - QUICK) * u * u
        : 1 + (2 - QUICK) * (u - 1);
  const th = g.th0 + TURNS * TAU * laps;
  const k = lerp(1, TIGHT, clamp01(u));
  let x = g.cx + Math.cos(th) * g.rx * k;
  let y = g.cy + Math.sin(th) * g.ry * k;
  if (ms < LOOP_AT) {
    const e = smooth(clamp01((ms - START_MS) / (LOOP_AT - START_MS)));
    x = lerp(g.ox, x, e);
    y = lerp(g.oy, y, e);
  } else if (ms > GATHER_AT) {
    const e = smooth(clamp01((ms - GATHER_AT) / GATHER_MS));
    x = lerp(x, g.bx, e);
    y = lerp(y, g.by, e);
    const p = clamp01((ms - BALL_AT) / PACK_MS);
    x += Math.sin(ms * 0.11) * TREMBLE * p;
    y += Math.cos(ms * 0.137) * TREMBLE * p;
  }
  into.x = x + g.live.own.x;
  into.y = y + g.live.own.y;
  return into;
}

function spreadAt(ms: number): number {
  if (ms < LOOP_AT)
    return lerp(BURST_R, LOOP_R[0], smooth(clamp01((ms - START_MS) / 200)));
  if (ms < GATHER_AT)
    return lerp(LOOP_R[0], LOOP_R[1], (ms - LOOP_AT) / LOOP_MS);
  return lerp(
    LOOP_R[1],
    PACK,
    smooth(clamp01((ms - GATHER_AT) / (GATHER_MS + PACK_MS))),
  );
}

interface State {
  loop: Loop;
  swarm: Swarm;
  dives: Dives;
  // each wave's bar; the readouts they dive onto, its own last
  order: number[];
  targets: Point[];
  waveStarts: number[];
  waveHits: number[];
  climaxHit: number;
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();

registerFloorCrit("shoalCrit", {
  plan(r, bars, hit) {
    const own = bars[0];
    const half = r.play.barHalfWidth;
    let mid = 0;
    for (let i = 0; i < bars.length; i++) mid += bars[i].x;
    mid = mid / bars.length - own.x;
    const top = skyY(r, bars, ABOVE) - own.y;
    const bottom = groundY(r, bars, BELOW) - own.y;
    const cy = (top + bottom) / 2;
    const ry = Math.max((bottom - top) / 2, MIN_RY);
    const rx = Math.min(half + OUT, r.viewportWidth * 0.46);
    const ox = -own.x;
    const oy = -own.y;
    const loop: Loop = {
      live: { own },
      ox,
      oy,
      cx: mid,
      cy,
      rx,
      ry,
      th0: Math.atan2((oy - cy) / ry, (ox - mid) / rx),
      bx: half - READ - BESIDE,
      by: -UP,
    };
    // the waves, closing up; each onto the readout nearest the shoal then
    const others = bars.length - 1;
    const waveStarts: number[] = [];
    const order: number[] = [];
    const left: number[] = [];
    for (let i = 1; i < bars.length; i++) left.push(i);
    const at: Point = { x: 0, y: 0 };
    for (let k = 0; k < others; k++) {
      const u = WAVES_END * (1 - (1 - (k + 0.5) / others) ** CLOSE);
      const t = LOOP_AT + LOOP_MS * u;
      waveStarts.push(t);
      shoalAt(loop, t, at);
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < left.length; j++) {
        const b = bars[left[j]];
        const d = Math.hypot(b.x + half - READ - at.x, b.y - at.y);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      order.push(left[best]);
      left.splice(best, 1);
    }
    const swarm = planSwarm((ms, into) => shoalAt(loop, ms, into), {
      count: COUNT,
      startMs: START_MS,
      endMs: CLIMAX,
      spread: spreadAt,
      spinHz: SPIN_HZ,
      lagMs: LAG_MS,
      squash: SQUASH,
    });
    // the leads up front, near its middle
    for (let i = 0; i < LEADS; i++) {
      swarm.lag[i] = 0;
      swarm.reach[i] = 0.2 + 0.15 * i;
    }
    const dives = planDives(
      swarm,
      waveStarts,
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      others ? WAVES_SHARE : 0,
    );
    for (let i = 0; i < LEADS; i++) dives.startMs[i] = Infinity;
    diveRest(dives, others, CLIMAX, CLIMAX_SPREAD_MS);
    const waveHits = waveStarts.map((w) => w + WAVE_SPREAD_MS / 2 + FLIGHT_MS);
    order.forEach((bar, k) => hit(bar, waveHits[k], 0));
    const climaxHit = CLIMAX + CLIMAX_SPREAD_MS + FLIGHT_MS;
    hit(0, climaxHit, 1);
    const leads = Array.from({ length: LEADS }, (_, i) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < START_MS || ms >= dives.startMs[i]
          ? null
          : swarmAt(swarm, i, ms, p);
    });
    const targets: Point[] = [];
    for (let k = 0; k <= others; k++) targets.push({ x: 0, y: 0 });
    states.set(r, {
      loop,
      swarm,
      dives,
      order,
      targets,
      waveStarts,
      waveHits,
      climaxHit,
      leads,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { order, targets, swarm, dives } = state;
    const reach = r.play.barHalfWidth - READ;
    state.loop.live.own = bars[0];
    for (let k = 0; k < order.length; k++) {
      targets[k].x = bars[order[k]].x + reach;
      targets[k].y = bars[order[k]].y;
    }
    const own = targets[order.length];
    own.x = bars[0].x + reach;
    own.y = bars[0].y;
    swarm.squash =
      ms < GATHER_AT
        ? SQUASH
        : lerp(SQUASH, BALL_SQUASH, clamp01((ms - GATHER_AT) / GATHER_MS));
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.3 * p), {
        alpha: 1 - p,
      });
    }
    // a swoosh as each wave peels off
    while (
      r.kicked < state.waveStarts.length &&
      ms >= state.waveStarts[r.kicked]
    ) {
      playSwoosh();
      r.kicked++;
    }
    drawSwarm(ctx, swarm, ms, SPECK, dives);
    drawDives(ctx, swarm, dives, targets, ms, SPECK);
    for (let i = 0; i < LEADS; i++)
      drawWispBetween(
        ctx,
        state.leads[i],
        ms,
        now,
        LEAD,
        ms > GATHER_AT ? 1 : 0.6,
        START_MS,
        dives.startMs[i] + 1,
      );
    for (let k = 0; k < order.length; k++)
      drawDetonation(ctx, targets[k], ms - state.waveHits[k], BLAST, now);
    drawDetonation(ctx, own, ms - state.climaxHit, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
