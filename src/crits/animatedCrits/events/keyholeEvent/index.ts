// the "Keyhole" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while a wisp rises off the clicked floor's
// button and fires a beam up onto the building's locked floor, burning the
// outline of a giant keyhole into it, sparks spraying; a key wisp then
// shoots up into the keyhole and turns, click, click, each a flash and a
// jolt, and on the final clunk the floor bursts open in a huge blast and
// shake, unlocked for free as the screen unfreezes. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "keyhole";
// the keyhole's round top is ROUND px round, its slot SLOT px wide at the
// top flaring to FLARE_W at its foot, FOOT px below the round's middle
const ROUND = 0.16;
const SLOT = 0.35;
const FLARE_W = 0.7;
const FOOT = 0.32;
const ARC_POINTS = 18;
const OUTLINE = 9;
const AIM = 5;
const SPARK = 22;
const EMITTER = 0.55;
const KEY_SIZE = 0.6;
const UP = 60;
const CLICK_SHAKE: [number, number] = [0.6, 1];

export const forceKeyholeEvent = registerWispEvent(
  KEY,
  "Keyhole",
  () => CONFIG.keyholeEvent.chance,
  (floor, context) => {
    const { riseMs, traceMs, flyMs, clicksMs, holdMs, mergeMs } =
      CONFIG.keyholeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const size = FLOOR_H;
    const round: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H * 0.4 };
    const r = size * ROUND;
    // the outline: round the top from the slot's left edge to its right,
    // down the right side, across the foot and back up
    const slotAngle = Math.asin(SLOT / 2);
    const outline: Point[] = [];
    for (let i = 0; i <= ARC_POINTS; i++) {
      const a =
        Math.PI / 2 +
        slotAngle +
        ((Math.PI * 2 - slotAngle * 2) * i) / ARC_POINTS;
      outline.push({
        x: round.x + Math.cos(a) * r,
        y: round.y + Math.sin(a) * r,
      });
    }
    const foot = round.y + size * FOOT;
    outline.push({ x: round.x + r * FLARE_W, y: foot });
    outline.push({ x: round.x - r * FLARE_W, y: foot });
    outline.push(outline[0]);
    const lengths = outline
      .slice(1)
      .map((p, i) => Math.hypot(p.x - outline[i].x, p.y - outline[i].y));
    const perimeter = lengths.reduce((s, l) => s + l, 0);
    const emitter: Point = { x: button.x, y: button.y - UP };
    const traceAt = riseMs;
    const tracedAt = traceAt + traceMs;
    const keyLands = tracedAt + flyMs;
    const clicks = clicksMs.reduce<number[]>(
      (list, gap) => [...list, (list[list.length - 1] ?? keyLands) + gap],
      [],
    );
    const endAt = clicks[clicks.length - 1];
    const tip: Point = { x: 0, y: 0 };
    const tipAt = (d: number): number => {
      // the index of the segment the tracer is on, tip set to its spot
      let left = d;
      for (let i = 0; i < lengths.length; i++) {
        if (left <= lengths[i]) {
          const u = left / (lengths[i] || 1);
          tip.x = lerp([outline[i].x, outline[i + 1].x], u);
          tip.y = lerp([outline[i].y, outline[i + 1].y], u);
          return i;
        }
        left -= lengths[i];
      }
      tip.x = outline[outline.length - 1].x;
      tip.y = outline[outline.length - 1].y;
      return lengths.length;
    };
    const emitterAt: Point = { x: 0, y: 0 };
    const emitterWisp = (ms: number): Point | null => {
      if (ms > tracedAt + 200) return null;
      const u = easeOut(Math.min(1, ms / riseMs));
      emitterAt.x = lerp([button.x, emitter.x], u);
      emitterAt.y = lerp([button.y, emitter.y], u);
      return emitterAt;
    };
    const keyAt: Point = { x: 0, y: 0 };
    const keyWisp = (ms: number): Point | null => {
      if (ms < tracedAt || ms > endAt) return null;
      const u = easeIn(Math.min(1, (ms - tracedAt) / flyMs));
      keyAt.x = lerp([button.x, round.x], u);
      keyAt.y = lerp([button.y, round.y + r * 0.5], u);
      return keyAt;
    };
    const keyhole: Point = { x: round.x, y: round.y + r };

    const clicking = createBeats(
      clicks,
      (ms) => ms,
      (_, k) => {
        if (k === clicks.length - 1) {
          cover!.blast(keyhole);
          return;
        }
        cover!.burst(keyhole, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CLICK_SHAKE, k / Math.max(1, clicks.length - 2)));
      },
    );
    const flying = createBeats(
      [tracedAt],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          flying.tick(ms, now);
          clicking.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          if (ms >= traceAt) {
            const d = perimeter * Math.min(1, (ms - traceAt) / traceMs);
            const seg = tipAt(d);
            const glow = ms > tracedAt ? 1 : 0.85;
            for (let i = 0; i < seg; i++)
              drawBeam(ctx, outline[i], outline[i + 1], OUTLINE, glow);
            if (seg < lengths.length)
              drawBeam(ctx, outline[seg], tip, OUTLINE, glow);
            if (ms < tracedAt) {
              drawBeam(ctx, emitter, tip, AIM, 0.7);
              drawBeamFlare(ctx, tip, SPARK, 1, now);
            }
          }
          drawWispBetween(
            ctx,
            emitterWisp,
            ms,
            now,
            WISP_SIZE * EMITTER,
            0.7,
            0,
            tracedAt + 200,
          );
          drawWispBetween(
            ctx,
            keyWisp,
            ms,
            now,
            WISP_SIZE * KEY_SIZE,
            1,
            tracedAt,
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
