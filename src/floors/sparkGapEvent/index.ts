// the "Spark Gap" event (lightning; a free floor): it covers its crit,
// whose click freezes the screen while two electrode wisps fly out of the
// clicked floor's button to either side of the building's locked floor;
// sparks start jumping the gap between them across the floor, a crack and
// a jolt each, sputtering at first, then ever faster, until a fat
// crackling arc holds steady across it, thickening as the screen rumbles;
// then it discharges in a blinding flash and the floor bursts open in a
// huge blast and shake, unlocked for free as the screen unfreezes. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "sparkGap";
const SPARKS = 9;
const INSET = 30;
const SPARK_MS = 110;
const ELECTRODE = 0.6;
const SPARK_SHAKE: [number, number] = [0.3, 0.9];

export const forceSparkGapEvent = registerWispEvent(
  KEY,
  "Spark Gap",
  () => CONFIG.sparkGapEvent.chance,
  (floor, context) => {
    const { flyMs, sparksMs, arcMs, holdMs, mergeMs } = CONFIG.sparkGapEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const y = locked.offsetY + FLOOR_H / 2;
    const ends: Point[] = [
      { x: INSET, y },
      { x: FLOOR_W - INSET, y },
    ];
    const middle: Point = { x: FLOOR_W / 2, y };
    // sparks sputter, then come ever faster
    const sparks = Array.from({ length: SPARKS }, (_, k) => ({
      at: flyMs + sparksMs * Math.sqrt(k / SPARKS),
      bolt: createBolt(ends[0], ends[1], 2),
    }));
    const arcAt = flyMs + sparksMs;
    const endAt = arcAt + arcMs;
    const arc = createBolt(ends[0], ends[1], 4);
    const electrodes = ends.map((end) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        const u = easeOut(clamp01(ms / flyMs));
        at.x = lerp([button.x, end.x], u);
        at.y = lerp([button.y, end.y], u);
        return at;
      };
    });

    const sparking = createBeats(
      sparks,
      (s) => s.at,
      (_, k) => {
        if (!cover?.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(SPARK_SHAKE, k / (SPARKS - 1)));
      },
    );
    const rumbling = createBeats(
      [arcAt, arcAt + arcMs / 2],
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive()) shakeScreen(0.7 + 0.4 * k);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(middle),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          sparking.tick(ms, now);
          rumbling.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const s of sparks) {
            const t = (ms - s.at) / SPARK_MS;
            if (t >= 0 && t < 1) drawBolt(ctx, s.bolt, 1 - t, 0.6);
          }
          if (ms >= arcAt && ms <= endAt) {
            const grow = clamp01((ms - arcAt) / arcMs);
            drawBolt(ctx, arc, 0.9, 0.8 + grow * 1.2);
            drawStrike(ctx, ends[0], 0.8, 0.6 + grow, now);
            drawStrike(ctx, ends[1], 0.8, 0.6 + grow, now);
          }
          for (const e of electrodes)
            drawWispBetween(
              ctx,
              e,
              ms,
              now,
              WISP_SIZE * ELECTRODE,
              clamp01(ms / endAt),
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
