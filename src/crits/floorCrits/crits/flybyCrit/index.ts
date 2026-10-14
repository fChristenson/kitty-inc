// Flyby, a floor crit: the number shoots out into a big comet wisp that
// swings into orbit round every bar in view, out past their ends and over
// the top and bottom; each time it sweeps down past a bar it flicks a shard
// wisp into it in a blast with levels, the orbit tightening and quickening
// lap by lap, the comet swelling hotter; then it spirals in and plunges
// into its own bar in a huge blast
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

const IN_MS = 180;
// the orbit: PAST the bars' ends and ABOVE the top and bottom ones at first,
// tightening to TIGHT of that; LAPS laps over ORBIT_MS, quickening as
// u^SPEED_UP
const PAST = 130;
const ABOVE = 220;
const TIGHT = 0.55;
const LAPS = 3;
const ORBIT_MS = 2000;
const SPEED_UP = 1.6;
// the plunge into its own bar
const PLUNGE_MS = 170;
const COMET: [number, number] = [1.3, 2.4];
const SHARD = WISP_SIZE * 0.8;
const SHARD_MS = 160;
const SHARD_BLAST = 120;
const OWN_BLAST = 420;
const LAP_SHAKE = 0.4;
// shakes by step: a shard in, its own
const SHAKES = [0.6, 3];

interface Shard {
  bar: number;
  from: number;
  lands: number;
  at: (ms: number) => Point | null;
}
interface State {
  bars: Point[];
  laps: number[];
  shards: Shard[];
  plungeAt: number;
  hitAt: number;
  comet: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();

const turnAt = (u: number) => -Math.PI / 2 + Math.PI * 2 * LAPS * u ** SPEED_UP;
const reachAt = (u: number) => lerp(1, TIGHT, u);

registerFloorCrit("flybyCrit", {
  // three shards a bar
  levels: (count) => Math.ceil(count / 3),
  plan(r, bars, hit) {
    const base = bars[0];
    let top = Infinity;
    let bottom = -Infinity;
    for (const bar of bars) {
      top = Math.min(top, bar.y - base.y);
      bottom = Math.max(bottom, bar.y - base.y);
    }
    const centre = { x: 0, y: (top + bottom) / 2 };
    const rx = r.play.barHalfWidth + PAST;
    const ry = (bottom - top) / 2 + ABOVE;
    const orbitAt = (u: number, into: Point) => {
      const a = turnAt(u);
      const k = reachAt(u);
      into.x = centre.x + Math.cos(a) * rx * k;
      into.y = centre.y + Math.sin(a) * ry * k;
      return into;
    };
    const state: State = {
      bars,
      laps: [],
      shards: [],
      plungeAt: IN_MS + ORBIT_MS,
      hitAt: IN_MS + ORBIT_MS + PLUNGE_MS,
      comet: () => null,
    };
    for (let l = 1; l < LAPS; l++)
      state.laps.push(IN_MS + ORBIT_MS * (l / LAPS) ** (1 / SPEED_UP));
    // a shard into each bar as the comet sweeps down past it on the right
    const p: Point = { x: 0, y: 0 };
    const was = orbitAt(0, { x: 0, y: 0 });
    for (let ms = 1; ms <= ORBIT_MS; ms++) {
      orbitAt(ms / ORBIT_MS, p);
      if (p.x > centre.x)
        for (let bar = 1; bar < bars.length; bar++) {
          const y = bars[bar].y - base.y;
          if (was.y >= y || p.y < y) continue;
          const from = IN_MS + ms;
          const lands = from + SHARD_MS;
          const fx = p.x;
          const fy = p.y;
          const spot: Point = { x: 0, y: 0 };
          state.shards.push({
            bar,
            from,
            lands,
            at: (now) => {
              if (now < from || now > lands) return null;
              const u = (now - from) / SHARD_MS;
              const own = state.bars[0];
              const to = state.bars[bar];
              spot.x = lerp(own.x + fx, to.x, u * u);
              spot.y = lerp(own.y + fy, to.y, u * u);
              return spot;
            },
          });
          hit(bar, lands, 0);
        }
      was.x = p.x;
      was.y = p.y;
    }
    hit(0, state.hitAt, 1);
    const end = orbitAt(1, { x: 0, y: 0 });
    const spot: Point = { x: 0, y: 0 };
    state.comet = (ms) => {
      if (ms < IN_MS || ms > state.hitAt) return null;
      const own = state.bars[0];
      if (ms < state.plungeAt) {
        orbitAt((ms - IN_MS) / ORBIT_MS, spot);
      } else {
        const u = ((ms - state.plungeAt) / PLUNGE_MS) ** 2;
        spot.x = lerp(end.x, 0, u);
        spot.y = lerp(end.y, 0, u);
      }
      spot.x += own.x;
      spot.y += own.y;
      return spot;
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.7 * p), {
        alpha: 1 - p,
      });
    }
    // a whoosh and a jolt at every lap
    while (r.kicked < state.laps.length && ms >= state.laps[r.kicked]) {
      r.shake(LAP_SHAKE);
      playSwoosh();
      r.kicked++;
    }
    const heat = clamp01((ms - IN_MS) / (state.hitAt - IN_MS));
    drawWispBetween(
      ctx,
      state.comet,
      ms,
      now,
      WISP_SIZE * lerp(COMET[0], COMET[1], heat),
      heat,
      IN_MS,
      state.hitAt,
    );
    for (const s of state.shards) {
      drawWispBetween(ctx, s.at, ms, now, SHARD, 0.8, s.from, s.lands);
      drawDetonation(ctx, bars[s.bar], ms - s.lands, SHARD_BLAST, now);
    }
    drawDetonation(ctx, bars[0], ms - state.hitAt, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
