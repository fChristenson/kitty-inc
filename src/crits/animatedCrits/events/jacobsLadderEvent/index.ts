// the "Jacob's Ladder" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while two glowing rods flare up in a
// tall V from the bottom of the screen and an arc of lightning cracks
// across their feet with a bang; the arc climbs, crackling and stretching
// wider, ever faster, and every income bar it sweeps through jolts with a
// crack and a flash and lands free levels; at the top it snaps with a huge
// blast and shake and every bar slams. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "jacobsLadder";
const MAX_BARS = 6;
// the rods stand GAP px apart at their feet and SPREAD of the screen's width
// at their tops
const GAP = 110;
const SPREAD = 0.86;
const ROD = 10;
// ECHOES fainter arcs trail ECHO_MS apart below the climbing one
const ECHOES = 2;
const ECHO_MS = 60;
const CROSS_SHAKE: [number, number] = [0.9, 1.8];
const CROSS_BURST: [number, number] = [0.6, 1];

export const forceJacobsLadderEvent = registerWispEvent(
  KEY,
  "Jacob's Ladder",
  () => CONFIG.jacobsLadderEvent.chance,
  (floor, context, area) => {
    const { igniteMs, climbMs, levelShare, holdMs, mergeMs } =
      CONFIG.jacobsLadderEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const middle = (area.left + area.right) / 2;
    const half = ((area.right - area.left) * SPREAD) / 2;
    const bottom = area.bottom - 20;
    const top = area.top + 50;
    const feet = [
      { x: middle - GAP / 2, y: bottom },
      { x: middle + GAP / 2, y: bottom },
    ];
    const heads = [
      { x: middle - half, y: top },
      { x: middle + half, y: top },
    ];
    const snapAt = igniteMs + climbMs;
    // how far up the rods (0..1) the arc is ms in
    const height = (ms: number) => easeIn(clamp01((ms - igniteMs) / climbMs));
    const place = (h: number, side: number, into: Point): Point => {
      into.x = feet[side].x + (heads[side].x - feet[side].x) * h;
      into.y = bottom + (top - bottom) * h;
      return into;
    };
    // the arc and its echoes, their ends moved every frame
    const arcs = Array.from({ length: ECHOES + 1 }, () =>
      createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0),
    );
    const crossings = bars
      .map((bar) => {
        const h = (bottom - bar.center.y) / (bottom - top);
        return { bar, at: igniteMs + climbMs * Math.sqrt(clamp01(h)) };
      })
      .sort((a, b) => a.at - b.at);

    const igniting = createBeats(
      [igniteMs],
      (ms) => ms,
      () => {
        cover!.burst({ x: middle, y: bottom }, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const crossing = createBeats(
      crossings,
      (c) => c.at,
      ({ bar }, k) => {
        const t = k / Math.max(1, crossings.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), {
          x: bar.center.x,
          y: bar.center.y + 60,
        });
        cover!.burst(bar.center, lerp(CROSS_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CROSS_SHAKE, t));
      },
    );
    const finale = createBeats(
      [snapAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.levels(own, levelsFor(own.floor, levelShare, 2));
        cover!.blast({ x: middle, y: top });
      },
    );
    const ends = [0, 1].map((side) => {
      const into: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < 0 ? null : place(height(ms), side, into);
    });

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: snapAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          igniting.tick(ms, now);
          crossing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= snapAt) return;
          const up = clamp01(ms / igniteMs);
          for (let side = 0; side < 2; side++)
            drawBeam(ctx, feet[side], heads[side], ROD, 0.45 * up);
          if (ms >= igniteMs) {
            arcs.forEach((arc, k) => {
              const h = height(ms - k * ECHO_MS);
              place(h, 0, arc.from);
              place(h, 1, arc.to);
              drawBolt(ctx, arc, k === 0 ? 1 : 0.45 / k, 1 - 0.25 * k);
            });
            drawStrike(ctx, arcs[0].from, 0.8, 0.6, now);
            drawStrike(ctx, arcs[0].to, 0.8, 0.6, now);
          }
          const heat = height(ms);
          for (const at of ends)
            drawWispBetween(ctx, at, ms, now, WISP_SIZE, heat, 0, snapAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
