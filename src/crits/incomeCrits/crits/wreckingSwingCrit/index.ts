// the wrecking swing income crit: the number becomes a wrecking ball on a
// chain of light hung from above the total, swinging through the readout end
// to end and smashing a trail of blasts across it every pass, wider and
// faster; the last pass snaps the chain and the ball slams into the middle
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawBeam } from "../../../../shared/beam";
import { smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink } from "../shared";

const LIFT_MS = 220;
const PASSES = 5;
const PASS_MS: [number, number] = [440, 260];
// how far each pass swings either side (rad), widening
const REACH: [number, number] = [0.9, 1.25];
// the pivot this far over the total, the chain this long, so the ball
// sweeps just under the readout
const PIVOT_UP = 310;
const CHAIN = 440;
// where along each pass it smashes the readout (rad either side of straight down)
const MARKS = [-0.5, 0, 0.5];
const SNAP_SLAM_MS = 90;
const CHAIN_WIDTH = 18;
const BALL = WISP_SIZE * 2.2;
const SMASH_BLAST = 170;
const SNAP_KICK = 1.2;
// shakes by step: a smash, the slam
const SHAKES = [0.7, 2.4];

interface Swing {
  pivot: Point;
  passAt: number[];
  smashes: Point[];
  smashAt: number[];
  snapAt: number;
  endAt: number;
  ball: (ms: number) => Point;
}
const swings = new WeakMap<Running, Swing>();

const passMs = (k: number) => lerp(PASS_MS[0], PASS_MS[1], k / (PASSES - 1));
const reach = (k: number) => lerp(REACH[0], REACH[1], k / (PASSES - 1));
// odd passes swing back the other way
const side = (k: number) => (k % 2 ? 1 : -1);

function planSwing(to: Point): Swing {
  const pivot = { x: to.x, y: to.y - PIVOT_UP };
  const passAt = [LIFT_MS];
  for (let k = 1; k < PASSES; k++) passAt.push(passAt[k - 1] + passMs(k - 1));
  const angle = (ms: number) => {
    let k = 0;
    while (k < PASSES - 1 && ms >= passAt[k + 1]) k++;
    const t = clamp01((ms - passAt[k]) / passMs(k));
    return -side(k) * reach(k) * Math.cos(Math.PI * t);
  };
  const ballAt = (a: number, into: Point): Point => {
    into.x = pivot.x + Math.sin(a) * CHAIN;
    into.y = pivot.y + Math.cos(a) * CHAIN;
    return into;
  };
  const smashes: Point[] = [];
  const smashAt: number[] = [];
  for (let k = 0; k < PASSES - 1; k++)
    for (const m of MARKS) {
      smashes.push(ballAt(m, { x: 0, y: 0 }));
      smashAt.push(
        passAt[k] +
          (Math.acos((-m * side(k)) / reach(k)) / Math.PI) * passMs(k),
      );
    }
  const last = PASSES - 1;
  const snapAt = passAt[last] + passMs(last) / 2;
  const endAt = snapAt + SNAP_SLAM_MS;
  const start = ballAt(angle(LIFT_MS), { x: 0, y: 0 });
  const snap = ballAt(angle(snapAt), { x: 0, y: 0 });
  const spot: Point = { x: 0, y: 0 };
  return {
    pivot,
    passAt,
    smashes,
    smashAt,
    snapAt,
    endAt,
    ball: (ms) => {
      if (ms < LIFT_MS) {
        const u = smoothstep(clamp01(ms / LIFT_MS));
        spot.x = start.x * u;
        spot.y = start.y * u;
        return spot;
      }
      if (ms < snapAt) return ballAt(angle(ms), spot);
      const u = clamp01((ms - snapAt) / SNAP_SLAM_MS);
      spot.x = lerp(snap.x, to.x, u);
      spot.y = lerp(snap.y, to.y, u);
      return spot;
    },
  };
}

registerFloorCrit("wreckingSwingCrit", {
  plan(r, bars, hit) {
    const swing = planSwing(bars[0]);
    swings.set(r, swing);
    for (const at of swing.smashAt) hit(0, at);
    hit(0, swing.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const swing = swings.get(r);
    if (!swing) return;
    const now = r.startedAt + ms;
    const { snapAt, endAt, smashes, smashAt } = swing;
    drawNumberShrink(ctx, r, ms);
    if (ms >= snapAt && r.kicked === 0) {
      r.kicked = 1;
      r.shake(SNAP_KICK);
    }
    if (ms < snapAt) {
      const grow = smoothstep(clamp01((ms - LIFT_MS / 2) / (LIFT_MS / 2)));
      drawBeam(ctx, swing.pivot, swing.ball(ms), CHAIN_WIDTH, grow);
    }
    drawWispBetween(ctx, swing.ball, ms, now, BALL, 1, 0, endAt);
    for (let k = 0; k < smashes.length; k++)
      drawDetonation(ctx, smashes[k], ms - smashAt[k], SMASH_BLAST, now);
    drawFinale(ctx, bars[0], ms - endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
