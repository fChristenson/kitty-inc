// Bat Cloud, a floor crit: a cave mouth of light flares at the side of the
// screen and a dark-gold cloud of hundreds of specks led by a few wisps
// pours out of it in one long ribbon that snakes through the building, in
// through one bar end to end and hairpinning down into the next, quicker
// each; as it threads each bar a wave peels off into its readout, levelling
// it with a flash, the waves closing up; then the whole cloud wheels round
// into a tight churning ball beside its own bar and drives into it whole
import { COLOR } from "../../../../palette";
import {
  diveRest,
  drawDives,
  drawSwarm,
  planSwarm,
  swarmAt,
  type Dives,
  type Swarm,
} from "../../../../shared/animationStyles/swarm";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01 } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  byHeight,
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { skyY } from "../../critPlayer/shared";

const IN_MS = 130;
// the cloud: COUNT specks, LEADS of them wisps up front, drawn at ALPHA
const COUNT = 240;
const LEADS = 3;
const SPECK = 17;
const LEAD = WISP_SIZE * 1.1;
const ALPHA = 0.82;
// the ribbon: out of the mouth from START_MS, its head at a mean SPEED px/ms
// (from QUICK of it, quickening), over RIBBON_MS at most/least; the farthest
// back trails its head by LAG_MS, RIBBON_R px thick, flattened SQUASH
const START_MS = 90;
const SPEED = 4.4;
const QUICK = 0.55;
const RIBBON_MS: [number, number] = [520, 1100];
const LAG_MS = 520;
const RIBBON_R = 34;
const SQUASH = 0.6;
const SPIN_HZ: [number, number] = [0.8, 6];
// the mouth: MOUTH_IN of the half viewport out at the side, ABOVE px over the
// top bar; a halo MOUTH_R across, flaring BURST_R as the cloud bursts out
const MOUTH_IN = 0.94;
const ABOVE = 170;
const MOUTH_R = 140;
const BURST_R = 300;
const BURST_MS = 170;
const MOUTH_FADE_MS = 220;
// threading a bar: THREAD of its half width either side; hairpins HAIRPIN px
// past its end (kept EDGE of the half viewport in)
const THREAD = 0.95;
const HAIRPIN = 130;
const EDGE = 0.96;
const SEG_SAMPLES = 20;
// the ball: BESIDE px in from its readout, UP px over its bar; the cloud
// wheels out to WHEEL_R over GATHER_MS, its tail lag shrinking to BALL_LAG,
// then packs to PACK over PACK_MS, trembling TREMBLE px
const BESIDE = 280;
const UP = 190;
const GATHER_MS = 240;
const PACK_MS = 190;
const WHEEL_R = 95;
const PACK = 36;
const BALL_SQUASH = 0.95;
const BALL_LAG = 40;
const TREMBLE = 10;
// a readout: READ px in from its bar's right end
const READ = 120;
// the waves: WAVES_SHARE of the cloud, packed into the front BAND of the
// ribbon, peeling off as they pass each bar's middle; each FLIGHT_MS in
const WAVES_SHARE = 0.5;
const BAND = 0.3;
const FLIGHT_MS = 140;
const CLIMAX_SPREAD_MS = 70;
// a wave's flash: FLASH px across over FLASH_MS
const FLASH = 240;
const FLASH_MS = 220;
const OWN_BLAST = 460;
// shakes by step: a wave in, the whole cloud in
const SHAKES = [0.8, 3.4];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);
const CAVE = fadeStops(COLOR.goldStandardAmber);

const smooth = (u: number) => u * u * (3 - 2 * u);

// the ribbon's path from its own bar, sampled: xs/ys and the length to each
interface Ribbon {
  live: { own: Point };
  xs: Float32Array;
  ys: Float32Array;
  len: Float32Array;
  length: number;
  ribbonMs: number;
  endMs: number;
  gatherAt: number;
  ballAt: number;
  climax: number;
}

// how far along (0..1) the head is u of the way through its run
const progress = (u: number) => QUICK * u + (1 - QUICK) * u * u;
// and the u it is f of the way along
const progressAt = (f: number) =>
  (-QUICK + Math.sqrt(QUICK * QUICK + 4 * (1 - QUICK) * f)) / (2 * (1 - QUICK));

// the head at ms: held in the mouth, along the path, then in the ball
function headAt(g: Ribbon, ms: number, into: Point): Point {
  const last = g.xs.length - 1;
  let x: number;
  let y: number;
  if (ms <= START_MS) {
    x = g.xs[0];
    y = g.ys[0];
  } else if (ms >= g.endMs) {
    x = g.xs[last];
    y = g.ys[last];
    const p = clamp01((ms - g.gatherAt) / (g.climax - g.gatherAt));
    x += Math.sin(ms * 0.11) * TREMBLE * p;
    y += Math.cos(ms * 0.137) * TREMBLE * p;
  } else {
    const s = progress((ms - START_MS) / g.ribbonMs) * g.length;
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (g.len[mid] <= s) lo = mid;
      else hi = mid;
    }
    const span = g.len[hi] - g.len[lo];
    const t = span > 0 ? (s - g.len[lo]) / span : 0;
    x = g.xs[lo] + (g.xs[hi] - g.xs[lo]) * t;
    y = g.ys[lo] + (g.ys[hi] - g.ys[lo]) * t;
  }
  into.x = x + g.live.own.x;
  into.y = y + g.live.own.y;
  return into;
}

// a Catmull-Rom curve through (px, py), SEG_SAMPLES a span
function sampleCurve(px: number[], py: number[]): Float32Array[] {
  const n = px.length;
  const count = (n - 1) * SEG_SAMPLES + 1;
  const xs = new Float32Array(count);
  const ys = new Float32Array(count);
  const len = new Float32Array(count);
  let j = 0;
  for (let k = 0; k < n - 1; k++) {
    const a = Math.max(0, k - 1);
    const d = Math.min(n - 1, k + 2);
    for (let s = 0; s < SEG_SAMPLES; s++) {
      const t = s / SEG_SAMPLES;
      const t2 = t * t;
      const t3 = t2 * t;
      xs[j] =
        0.5 *
        (2 * px[k] +
          (px[k + 1] - px[a]) * t +
          (2 * px[a] - 5 * px[k] + 4 * px[k + 1] - px[d]) * t2 +
          (-px[a] + 3 * px[k] - 3 * px[k + 1] + px[d]) * t3);
      ys[j] =
        0.5 *
        (2 * py[k] +
          (py[k + 1] - py[a]) * t +
          (2 * py[a] - 5 * py[k] + 4 * py[k + 1] - py[d]) * t2 +
          (-py[a] + 3 * py[k] - 3 * py[k + 1] + py[d]) * t3);
      j++;
    }
  }
  xs[j] = px[n - 1];
  ys[j] = py[n - 1];
  for (let i = 1; i < count; i++)
    len[i] = len[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  return [xs, ys, len];
}

interface State {
  ribbon: Ribbon;
  swarm: Swarm;
  dives: Dives;
  // each wave's bar; the readouts they dive onto, its own last
  order: number[];
  targets: Point[];
  waveStarts: number[];
  waveHits: number[];
  climaxHit: number;
  mouth: Point;
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();

registerFloorCrit("batCloudCrit", {
  plan(r, bars, hit) {
    const own = bars[0];
    const half = r.play.barHalfWidth;
    const edge = r.viewportWidth * 0.5 * EDGE;
    const keepIn = (x: number) =>
      Math.max(-edge, Math.min(edge, x + own.x)) - own.x;
    const order = byHeight(bars).filter((i) => i !== 0);
    const others = order.length;
    // the path: out of the mouth, end to end through each bar, hairpinning
    // round its end down to the next, then swinging round to the ball
    const mouth: Point = {
      x: -r.viewportWidth * 0.5 * MOUTH_IN - own.x,
      y: skyY(r, bars, ABOVE) - own.y,
    };
    const px = [mouth.x];
    const py = [mouth.y];
    const mids: number[] = [];
    for (let k = 0; k < others; k++) {
      const b = bars[order[k]];
      const x = b.x - own.x;
      const y = b.y - own.y;
      const dir = k % 2 ? -1 : 1;
      px.push(x - dir * half * THREAD, x + dir * half * THREAD);
      py.push(y, y);
      mids.push(px.length - 2);
      const nextY = k + 1 < others ? bars[order[k + 1]].y - own.y : -UP;
      px.push(keepIn(x + dir * (half * THREAD + HAIRPIN)));
      py.push((y + nextY) / 2);
    }
    const bx = half - READ - BESIDE;
    px.push(bx);
    py.push(-UP);
    const [xs, ys, len] = sampleCurve(px, py);
    const length = len[len.length - 1];
    const ribbonMs = Math.max(
      RIBBON_MS[0],
      Math.min(RIBBON_MS[1], length / SPEED),
    );
    const endMs = START_MS + ribbonMs;
    // a wave as the head passes each bar's middle
    const waveStarts: number[] = [];
    for (let k = 0; k < others; k++) {
      const i = mids[k] * SEG_SAMPLES + SEG_SAMPLES / 2;
      waveStarts.push(START_MS + ribbonMs * progressAt(len[i] / length));
    }
    const lastPeel = others
      ? waveStarts[others - 1] + BAND * LAG_MS + FLIGHT_MS
      : 0;
    const gatherAt = Math.max(endMs, lastPeel);
    const ballAt = gatherAt + GATHER_MS;
    const climax = ballAt + PACK_MS;
    const ribbon: Ribbon = {
      live: { own },
      xs,
      ys,
      len,
      length,
      ribbonMs,
      endMs,
      gatherAt,
      ballAt,
      climax,
    };
    const spread = (ms: number) =>
      ms < gatherAt
        ? RIBBON_R
        : ms < ballAt
          ? lerp(RIBBON_R, WHEEL_R, smooth((ms - gatherAt) / GATHER_MS))
          : lerp(WHEEL_R, PACK, smooth(clamp01((ms - ballAt) / PACK_MS)));
    const swarm = planSwarm((ms, into) => headAt(ribbon, ms, into), {
      count: COUNT,
      startMs: START_MS,
      endMs: climax,
      spread,
      spinHz: SPIN_HZ,
      lagMs: LAG_MS,
      squash: SQUASH,
    });
    // the leads up front, near its middle
    for (let i = 0; i < LEADS; i++) {
      swarm.lag[i] = 0;
      swarm.reach[i] = 0.2 + 0.15 * i;
    }
    // the waves packed into the ribbon's front, each peeling off as it
    // passes its bar's middle
    const startMs = new Float32Array(COUNT).fill(Infinity);
    const target = new Int16Array(COUNT);
    for (let i = LEADS; i < COUNT && others; i++) {
      if (hash01(i, 911) >= WAVES_SHARE) continue;
      const k = i % others;
      swarm.lag[i] = hash01(i, 912) * BAND;
      startMs[i] = waveStarts[k] + swarm.lag[i] * LAG_MS;
      target[i] = k;
    }
    const dives: Dives = { startMs, target, flightMs: FLIGHT_MS };
    diveRest(dives, others, climax, CLIMAX_SPREAD_MS);
    const waveHits = waveStarts.map((w) => w + (BAND * LAG_MS) / 2 + FLIGHT_MS);
    order.forEach((bar, k) => hit(bar, waveHits[k], 0));
    const climaxHit = climax + CLIMAX_SPREAD_MS + FLIGHT_MS;
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
      ribbon,
      swarm,
      dives,
      order,
      targets,
      waveStarts,
      waveHits,
      climaxHit,
      mouth,
      leads,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { order, targets, swarm, dives, ribbon } = state;
    const reach = r.play.barHalfWidth - READ;
    ribbon.live.own = bars[0];
    for (let k = 0; k < order.length; k++) {
      targets[k].x = bars[order[k]].x + reach;
      targets[k].y = bars[order[k]].y;
    }
    const own = targets[order.length];
    own.x = bars[0].x + reach;
    own.y = bars[0].y;
    // the ribbon's tail sweeping in as it wheels round into the ball
    const gather = clamp01((ms - ribbon.gatherAt) / GATHER_MS);
    swarm.lagMs = lerp(LAG_MS, BALL_LAG, smooth(gather));
    swarm.squash = lerp(SQUASH, BALL_SQUASH, gather);
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.3 * p), {
        alpha: 1 - p,
      });
    }
    // a swoosh as the cloud bursts out, and as each wave peels off
    while (
      r.kicked <= state.waveStarts.length &&
      ms >= (r.kicked ? state.waveStarts[r.kicked - 1] : START_MS)
    ) {
      playSwoosh();
      r.kicked++;
    }

    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // the cave mouth: swelling and throbbing, flaring as the cloud bursts
    // out, fading once its tail is out
    const gone = ms - START_MS - LAG_MS;
    if (gone < MOUTH_FADE_MS) {
      const mx = state.mouth.x + bars[0].x;
      const my = state.mouth.y + bars[0].y;
      const grow = smooth(clamp01(ms / START_MS));
      const throb = 1 + 0.18 * Math.sin(ms * 0.045);
      ctx.globalAlpha = gone > 0 ? 1 - gone / MOUTH_FADE_MS : 1;
      drawGlow(ctx, CAVE, mx, my, MOUTH_R * 1.6 * grow * throb, 1.3);
      drawGlow(ctx, GOLD, mx, my, MOUTH_R * grow * throb, 1.3);
      drawGlow(ctx, WHITE, mx, my, MOUTH_R * 0.4 * grow, 1.3);
      const burst = (ms - START_MS) / BURST_MS;
      if (burst >= 0 && burst < 1) {
        ctx.globalAlpha = 1 - burst;
        drawGlow(ctx, WHITE, mx, my, BURST_R * (0.5 + 0.7 * burst));
      }
    }
    // a cheap flash on each readout as its wave lands
    for (let k = 0; k < order.length; k++) {
      const f = (ms - state.waveHits[k]) / FLASH_MS;
      if (f < 0 || f >= 1) continue;
      const t = targets[k];
      ctx.globalAlpha = 1 - f;
      drawGlow(ctx, GOLD, t.x, t.y, FLASH * (0.6 + 0.9 * f));
      drawGlow(ctx, WHITE, t.x, t.y, FLASH * 0.45 * (1 - 0.5 * f));
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    drawSwarm(ctx, swarm, ms, SPECK, dives, ALPHA);
    drawDives(ctx, swarm, dives, targets, ms, SPECK);
    for (let i = 0; i < LEADS; i++)
      drawWispBetween(
        ctx,
        state.leads[i],
        ms,
        now,
        LEAD,
        ms > ribbon.gatherAt ? 1 : 0.6,
        START_MS,
        dives.startMs[i] + 1,
      );
    drawDetonation(ctx, own, ms - state.climaxHit, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
