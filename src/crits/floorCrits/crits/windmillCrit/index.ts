// the windmill floor crit: the number becomes a hub of four beam blades that
// spin up faster and faster, every blade blasting each bar it sweeps across
// in a rattling stream; then the blades fly off, each slamming onto a bar,
// and the hub drops onto its own bar in a huge blast
import { drawBeam } from "../../../../shared/beam";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";

const WINDMILL_IN_MS = 300;
const WINDMILL_GROW_MS = 260;
const WINDMILL_SPIN_MS = 1500;
const WINDMILL_OFF = WINDMILL_IN_MS + WINDMILL_SPIN_MS;
const BLADES = 4;
// turns (half laps) a second at the start, and gained a second
const WINDMILL_SPEED = 1;
const WINDMILL_GAIN = 1.5;
// each bar is swept at these spots along it; blades reach past the farthest
const WINDMILL_SPOTS = [-0.55, 0.55];
const WINDMILL_REACH = 80;
const WINDMILL_STEP_MS = 8;
const WINDMILL_BLADE = 26;
const WINDMILL_TIP = 0.7;
const WINDMILL_HUB = 1.3;
const WINDMILL_SWEEP = 100;
// the blades fly off onto the bars this long after letting go, this far apart
const WINDMILL_FLY_MS = 220;
const WINDMILL_FLY_GAP_MS = 60;
const WINDMILL_FLY_LIFT = 250;
const WINDMILL_SLAM = 220;
const WINDMILL_DROP_MS = 120;
const WINDMILL_BOOM = 420;
const WINDMILL_SHAKE = 0.35;
const WINDMILL_SLAM_SHAKE = 1.4;
const WINDMILL_BOOM_SHAKE = 2.6;
const WINDMILL_TAIL_MS = 1000;
const HUB: Point = { x: 0, y: 0 };
const TAU = Math.PI * 2;

const turn = (ms: number) => {
  const s =
    (clamp01((ms - WINDMILL_IN_MS) / WINDMILL_SPIN_MS) * WINDMILL_SPIN_MS) /
    1000;
  return Math.PI * (WINDMILL_SPEED * s + WINDMILL_GAIN * s * s);
};
const spotsOf = (r: Running, bars: Point[]) =>
  bars.flatMap((_, bar) =>
    WINDMILL_SPOTS.map((side) => ({
      bar,
      side,
      at: along(r, bars, bar, side),
    })),
  );
const lengthOf = (r: Running, bars: Point[]) =>
  Math.max(...spotsOf(r, bars).map((s) => Math.hypot(s.at.x, s.at.y))) +
  WINDMILL_REACH;
const grown = (ms: number) =>
  clamp01((ms - WINDMILL_IN_MS * 0.6) / WINDMILL_GROW_MS);

// every time a blade passes over a spot, planned once a run
interface Sweep {
  bar: number;
  side: number;
  ms: number;
}
const planned = new WeakMap<Running, Sweep[]>();
function sweeps(r: Running, bars: Point[]): Sweep[] {
  const cached = planned.get(r);
  if (cached) return cached;
  const out: Sweep[] = [];
  const quarter = TAU / BLADES;
  for (const s of spotsOf(r, bars)) {
    const angle = Math.atan2(s.at.y, s.at.x);
    let prev = Math.floor((turn(WINDMILL_IN_MS) - angle) / quarter);
    for (
      let t = WINDMILL_IN_MS + WINDMILL_STEP_MS;
      t <= WINDMILL_OFF;
      t += WINDMILL_STEP_MS
    ) {
      const k = Math.floor((turn(t) - angle) / quarter);
      if (k !== prev) out.push({ bar: s.bar, side: s.side, ms: t });
      prev = k;
    }
  }
  planned.set(r, out);
  return out;
}

// the blades flying off, each onto a bar in turn top to bottom
function flights(r: Running, bars: Point[]) {
  const order = byHeight(bars);
  const length = lengthOf(r, bars);
  return Array.from({ length: BLADES }, (_, k) => {
    const a = turn(WINDMILL_OFF) + (k * TAU) / BLADES;
    const from = { x: Math.cos(a) * length, y: Math.sin(a) * length };
    const bar = order[k % order.length];
    const to = along(r, bars, bar, k % 2 ? 0.4 : -0.4);
    return {
      bar,
      from,
      to,
      lands: WINDMILL_OFF + WINDMILL_FLY_MS + k * WINDMILL_FLY_GAP_MS,
    };
  });
}
const boomAt = () =>
  WINDMILL_OFF +
  WINDMILL_FLY_MS +
  BLADES * WINDMILL_FLY_GAP_MS +
  WINDMILL_DROP_MS;

registerFloorCrit("windmillCrit", {
  plan(r, bars, hit) {
    for (const s of sweeps(r, bars)) hit(s.bar, s.ms);
    for (const f of flights(r, bars)) hit(f.bar, f.lands, 1);
    hit(0, boomAt(), 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    if (ms < WINDMILL_IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, r.flashFont * 0.4, ms / WINDMILL_IN_MS),
      );
    const length = lengthOf(r, bars) * grown(ms);
    if (ms >= WINDMILL_IN_MS * 0.6 && ms < WINDMILL_OFF) {
      const a0 = turn(ms);
      for (let k = 0; k < BLADES; k++) {
        const a = a0 + (k * TAU) / BLADES;
        const tip = { x: Math.cos(a) * length, y: Math.sin(a) * length };
        drawBeam(ctx, HUB, tip, WINDMILL_BLADE, 0.85);
        drawWisp(ctx, () => tip, ms, now, WISP_SIZE * WINDMILL_TIP, 0.8);
      }
    }
    const boom = boomAt();
    if (ms >= WINDMILL_IN_MS * 0.6 && ms < boom) {
      const drop = clamp01((ms - (boom - WINDMILL_DROP_MS)) / WINDMILL_DROP_MS);
      const at = {
        x: lerp(0, bars[0].x, drop * drop),
        y: lerp(0, bars[0].y, drop * drop),
      };
      drawWisp(
        ctx,
        () => at,
        ms,
        now,
        WISP_SIZE * WINDMILL_HUB,
        clamp01((ms - WINDMILL_IN_MS) / WINDMILL_SPIN_MS),
      );
    }
    if (ms >= WINDMILL_OFF && r.kicked === 0) {
      r.kicked = 1;
      playExplosion();
    }
    for (const f of flights(r, bars)) {
      const bow = {
        x: f.from.x * 1.2,
        y: Math.min(f.from.y, f.to.y) - WINDMILL_FLY_LIFT,
      };
      const spot: Point = { x: 0, y: 0 };
      drawWispBetween(
        ctx,
        (t) => {
          const u = clamp01((t - WINDMILL_OFF) / (f.lands - WINDMILL_OFF)) ** 2;
          const a = (1 - u) * (1 - u);
          const b = 2 * (1 - u) * u;
          spot.x = a * f.from.x + b * bow.x + u * u * f.to.x;
          spot.y = a * f.from.y + b * bow.y + u * u * f.to.y;
          return spot;
        },
        ms,
        now,
        WISP_SIZE,
        0.9,
        WINDMILL_OFF,
        f.lands,
      );
      drawDetonation(ctx, f.to, ms - f.lands, WINDMILL_SLAM, now);
    }
    for (const s of sweeps(r, bars)) {
      if (ms < s.ms || ms - s.ms > DETONATION_MS) continue;
      drawDetonation(
        ctx,
        along(r, bars, s.bar, s.side),
        ms - s.ms,
        WINDMILL_SWEEP,
        now,
      );
    }
    drawDetonation(ctx, bars[0], ms - boom, WINDMILL_BOOM, now);
  },
  tailMs: WINDMILL_TAIL_MS,
  shake: (step) =>
    step === 2
      ? WINDMILL_BOOM_SHAKE
      : step === 1
        ? WINDMILL_SLAM_SHAKE
        : WINDMILL_SHAKE,
});
