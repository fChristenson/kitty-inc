// the light pillars income crit: the number drops to the bottom of the
// screen as a wisp and races along it while pillars of light blast up from
// under it into the total, quick-fire, all across the readout; it stops in
// the middle and one giant pillar goes up for the huge blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

const DROP_MS = 420;
const PILLARS = 18;
const EVERY_MS = 50;
const RISE_MS = 60;
const SHOW_MS = 160;
const GIANT_DELAY_MS = 160;
// the floor it runs along: as far under the middle as this share of the
// total's height over it, less a margin
const BOTTOM = 0.75;
const FLOOR_UP = 90;
// pillars across the readout, stepping round it
const SPREAD = 320;
const STEP = 1.7;
const SLAM_Y = 25;
const PILLAR = 70;
const GIANT = 220;
const RUNNER = WISP_SIZE * 1.4;
const SLAM_BLAST = 180;
// shakes by step: a pillar, the giant
const SHAKES = [0.7, 2.4];

interface Pillars {
  floor: number;
  xs: number[];
  slams: Point[];
  giantAt: number;
  endAt: number;
  runner: (ms: number) => Point;
}
const runs = new WeakMap<Running, Pillars>();
const base: Point = { x: 0, y: 0 };
const top: Point = { x: 0, y: 0 };

const pillarAt = (k: number) => DROP_MS + k * EVERY_MS;

function planPillars(to: Point): Pillars {
  const floor = -to.y * BOTTOM - FLOOR_UP;
  const xs: number[] = [];
  const slams: Point[] = [];
  for (let k = 0; k < PILLARS; k++) {
    const x = to.x + Math.sin(k * STEP) * SPREAD;
    xs.push(x);
    slams.push({ x, y: to.y + (holeHash(k, 161) - 0.5) * 2 * SLAM_Y });
  }
  const giantAt = pillarAt(PILLARS - 1) + GIANT_DELAY_MS;
  const spot: Point = { x: 0, y: 0 };
  // under each pillar as it fires, gliding to the next, then to the middle
  const runner = (ms: number): Point => {
    if (ms < DROP_MS) {
      const u = smoothstep(clamp01(ms / DROP_MS));
      spot.x = lerp(0, xs[0], u);
      spot.y = lerp(0, floor, u);
      return spot;
    }
    const k = Math.min(PILLARS - 1, Math.floor((ms - DROP_MS) / EVERY_MS));
    const last = k === PILLARS - 1;
    const u = last
      ? clamp01((ms - pillarAt(k)) / (giantAt - pillarAt(k)))
      : clamp01((ms - pillarAt(k)) / EVERY_MS);
    spot.x = lerp(xs[k], last ? to.x : xs[k + 1], smoothstep(u));
    spot.y = floor;
    return spot;
  };
  return { floor, xs, slams, giantAt, endAt: giantAt + RISE_MS, runner };
}

function drawPillar(
  ctx: CanvasRenderingContext2D,
  x: number,
  floor: number,
  toY: number,
  since: number,
  width: number,
  now: number,
): void {
  if (since < 0 || since >= RISE_MS + SHOW_MS) return;
  const rising = since < RISE_MS;
  const fade = rising ? 1 : 1 - (since - RISE_MS) / SHOW_MS;
  base.x = x;
  base.y = floor;
  top.x = x;
  top.y = lerp(floor, toY, smoothstep(clamp01(since / RISE_MS)));
  drawBeam(
    ctx,
    base,
    top,
    width * (rising ? 1 : 1 + (since - RISE_MS) / SHOW_MS),
    fade,
  );
  drawBeamFlare(ctx, base, width, fade, now);
}

registerFloorCrit("lightPillarsCrit", {
  plan(r, bars, hit) {
    const run = planPillars(bars[0]);
    runs.set(r, run);
    for (let k = 0; k < PILLARS; k++) hit(0, pillarAt(k) + RISE_MS);
    hit(0, run.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const run = runs.get(r);
    if (!run) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { floor, xs, slams } = run;
    drawNumberShrink(ctx, r, ms);
    for (let k = 0; k < PILLARS; k++)
      drawPillar(ctx, xs[k], floor, to.y, ms - pillarAt(k), PILLAR, now);
    drawPillar(ctx, to.x, floor, to.y, ms - run.giantAt, GIANT, now);
    drawWispBetween(ctx, run.runner, ms, now, RUNNER, 1, 0, run.endAt);
    for (let k = 0; k < PILLARS; k++)
      drawDetonation(
        ctx,
        slams[k],
        ms - pillarAt(k) - RISE_MS,
        SLAM_BLAST,
        now,
      );
    drawFinale(ctx, to, ms - run.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
