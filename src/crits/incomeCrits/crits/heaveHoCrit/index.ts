// Heave Ho, an income crit: the green amount drops low under the total and
// swells into a heaving ball of glitter, held down by a wisp anchored below
// it on a line of light; the total throws down a line of its own and hauls,
// jolt by jolt, each yank dragging the ball up a step, a spray of its
// glitter flying up into the readout with a share, the anchor dragging it
// back between yanks; the yanks come harder and faster, both lines straining
// and the ball stretching and trembling; then the anchor's line snaps in a
// blast and the whole ball slams up into the total: the finale
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

// the ball: SPECKS of glitter BALL px round, from LOW px under the total,
// hauled up to HIGH; its anchor ANCHOR px under it
const IN_MS = 120;
const SPECKS = 110;
const BALL = 90;
const SPECK = 22;
const LOW = 900;
const HIGH = 230;
const ANCHOR = 480;
const STRETCH = 0.5;
const TREMBLE = 14;
// the yanks: YANKS from FIRST_MS, GAPS_MS apart (closing), each dragging
// the ball up over YANK_MS, the anchor dragging it back SAG px between;
// SPILL specks flying up into the readout over SPILL_MS each
const FIRST_MS = IN_MS + 260;
const YANKS = 8;
const GAPS_MS: [number, number] = [260, 70];
const YANK_MS = 70;
const SAG = 50;
const SPILL = 8;
const SPILL_MS = 110;
const LINE: [number, number] = [10, 34];
const YANK_BLAST = 120;
// the snap SNAP_GAP_MS after the last yank, the ball slamming in over SLAM_MS
const SNAP_GAP_MS = 140;
const SLAM_MS = 100;
const SNAP_BLAST = 260;
const ANCHOR_FALL = 1600;
// shakes by step: a yank's share, the finale
const SHAKES = [0.7, 2.8];

interface State {
  yanks: number[];
  snapAt: number;
  endMs: number;
  // each speck's angle and reach in the ball, the yank it spills on (YANKS:
  // the slam) and its spot on the readout
  angles: Float32Array;
  reach: Float32Array;
  spills: Uint8Array;
  spots: Point[];
}
const states = new WeakMap<Running, State>();
const ball: Point = { x: 0, y: 0 };
const anchor: Point = { x: 0, y: 0 };
const atAnchor = () => anchor;
const shiver: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };

// where the ball sits at ms: hauled up a step at each yank, sagging back
// between, slammed in at the end
function ballY(state: State, ms: number): number {
  const { yanks, snapAt } = state;
  if (ms >= snapAt)
    return lerp(
      heightAt(YANKS) + SAG,
      0,
      clamp01((ms - snapAt) / SLAM_MS) ** 2,
    );
  let k = -1;
  while (k + 1 < yanks.length && ms >= yanks[k + 1]) k++;
  if (k < 0) return LOW;
  const since = ms - yanks[k];
  const from = k === 0 ? LOW : heightAt(k) + SAG;
  const yank = clamp01(since / YANK_MS);
  const next = k + 1 < yanks.length ? yanks[k + 1] : snapAt;
  const sag = clamp01(
    (since - YANK_MS) / Math.max(1, next - yanks[k] - YANK_MS),
  );
  return lerp(from, heightAt(k + 1), 1 - (1 - yank) ** 3) + SAG * sag;
}
const heightAt = (k: number) => lerp(LOW, HIGH, k / YANKS);

registerFloorCrit("heaveHoCrit", {
  plan(r, _bars, hit) {
    const yanks: number[] = [];
    let t = FIRST_MS;
    for (let k = 0; k < YANKS; k++) {
      yanks.push(t);
      hit(0, t + SPILL_MS);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / (YANKS - 1));
    }
    const snapAt = yanks[YANKS - 1] + SNAP_GAP_MS;
    const endMs = snapAt + SLAM_MS;
    hit(0, endMs, 1);
    states.set(r, {
      yanks,
      snapAt,
      endMs,
      angles: Float32Array.from(
        { length: SPECKS },
        (_, i) => holeHash(i, 6610) * Math.PI * 2,
      ),
      reach: Float32Array.from({ length: SPECKS }, (_, i) =>
        Math.sqrt(holeHash(i, 6611)),
      ),
      spills: Uint8Array.from({ length: SPECKS }, (_, i) =>
        Math.min(YANKS, Math.floor(i / SPILL)),
      ),
      spots: Array.from({ length: SPECKS }, (_, i) =>
        readoutSpot(ORIGIN, i, 6612),
      ),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { yanks, snapAt, endMs, angles, reach, spills, spots } = state;
    drawNumberShrink(ctx, r, ms);
    if (ms < IN_MS) return;
    ctx.save();
    ctx.translate(to.x, to.y);
    // the strain: rising with every yank
    let yanked = 0;
    while (yanked < yanks.length && ms >= yanks[yanked]) yanked++;
    const strain = yanked / YANKS;
    trembleAt(strain, ms, TREMBLE, shiver);
    ball.x = shiver.x;
    ball.y = ballY(state, ms) + shiver.y;
    const grow = clamp01((ms - IN_MS) / 160);
    anchor.x = 0;
    anchor.y =
      LOW +
      ANCHOR +
      (ms > snapAt ? ANCHOR_FALL * ((ms - snapAt) / 400) ** 2 : 0);
    // the lines: the total's hauling it up, the anchor's holding it down
    // until it snaps
    const width = lerp(LINE[0], LINE[1], strain);
    if (ms < endMs && ms >= FIRST_MS - 120)
      drawBeam(ctx, ORIGIN, ball, width, 0.9);
    if (ms < snapAt) drawBeam(ctx, ball, anchor, width * 0.8, 0.8 * grow);
    if (ms < snapAt + 400)
      drawWispHead(ctx, atAnchor, ms, now, WISP_SIZE * 1.3, strain);
    // the ball: stretched along the lines as they strain, a spray flying up
    // off it into the readout at every yank
    const stretch = 1 + STRETCH * strain;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < angles.length; i++) {
      const spill = spills[i];
      const leaves = spill < YANKS ? yanks[spill] : snapAt;
      const flight = spill < YANKS ? SPILL_MS : SLAM_MS;
      const a = angles[i] + ms * 0.004;
      const rr = BALL * reach[i] * grow;
      bit.x = ball.x + (Math.cos(a) * rr) / stretch;
      bit.y = ball.y + Math.sin(a) * rr * stretch;
      if (ms >= leaves) {
        const u = ((ms - leaves) / flight) ** 2;
        if (u >= 1) continue;
        bit.x = lerp(bit.x, spots[i].x, u);
        bit.y = lerp(bit.y, spots[i].y, u);
      }
      stampGlimmer(
        ctx,
        bit.x,
        bit.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (let k = 0; k < yanks.length; k++)
      drawDetonation(
        ctx,
        spots[k * SPILL],
        ms - yanks[k] - SPILL_MS,
        YANK_BLAST,
        now,
      );
    anchor.y = LOW + ANCHOR;
    drawDetonation(ctx, anchor, ms - snapAt, SNAP_BLAST, now);
    ctx.restore();
    drawFinale(ctx, to, ms - endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
