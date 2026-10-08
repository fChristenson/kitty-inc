// the "Glitter Spill" event (clutter; a free floor): it covers its crit,
// whose click freezes the screen while a glitter jar wisp hops up off the
// clicked floor's button and tips over, spilling glitter that spreads out
// in a wave until it covers the whole screen below the locked floor; then
// one huge glittering broom cleans it up in brisk strokes: up the whole
// screen into a line under the lock, then in from the left and the right
// into one heap, which settles with a jolt and is shoved up into the lock,
// bursting it open in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawBroom,
  heapSpots,
  planSweep,
  scatterEvenly,
  simulateSweep,
  sweepLane,
  SWEEP_DEPTH,
  type BroomState,
} from "../../../../shared/clutter";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "glitterSpill";
const BITS = 320;
const BIT = 10;
const MARGIN = 40;
// the mess stays this far under the lock, and the line it's swept into
const BELOW = 150;
const LINE = 120;
const JAR = 0.6;
const HOP = 90;
const TIP_MS = 220;
const UP = 3;
const IN = 2;
const KEEP_OFF = 24;
const SHORT = 220;
const SETTLE_MS = 80;
const MOUND_W = 130;
const MOUND_H = 60;
const FADE_MS = 160;
const GATHER_MS = 180;
const SHOVE_MS = 240;
const TIP_SHAKE = 0.7;
const STROKE_SHAKE = 0.3;
const GATHER_SHAKE = 0.8;

export const forceGlitterSpillEvent = registerWispEvent(
  KEY,
  "Glitter Spill",
  () => CONFIG.glitterSpillEvent.chance,
  (floor, context, area) => {
    const { spillMs, dragMs, liftMs, holdMs, mergeMs } =
      CONFIG.glitterSpillEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const centre = (area.left + area.right) / 2;
    const box = {
      left: area.left + MARGIN,
      top: Math.min(
        area.bottom - 200,
        Math.max(area.top + MARGIN, lock.y + BELOW),
      ),
      right: area.right - MARGIN,
      bottom: area.bottom - MARGIN,
    };
    const spots = scatterEvenly(box, BITS);
    const source: Point = { x: button.x, y: button.y - HOP };
    const farthest = Math.max(
      ...spots.map((s) => Math.hypot(s.x - source.x, s.y - source.y)),
    );
    // the spill's front reaches each bit in turn, nearest first
    const reaches = spots.map(
      (s) =>
        TIP_MS +
        spillMs * 0.6 * (Math.hypot(s.x - source.x, s.y - source.y) / farthest),
    );
    const lineY = box.top - LINE * 0.5;
    const across = lineY - (SWEEP_DEPTH[0] + SWEEP_DEPTH[1]) / 2;
    const heap: Point = { x: lock.x, y: across };
    const sweep = planSweep(
      [
        ...sweepLane(
          { x: centre, y: area.bottom + 20 },
          { x: centre, y: lineY },
          UP,
          -Math.PI / 2,
          width * 1.02,
        ),
        ...sweepLane(
          { x: area.left - 20, y: across },
          { x: heap.x - KEEP_OFF, y: across },
          IN,
          0,
          SHORT,
        ),
        ...sweepLane(
          { x: area.right + 20, y: across },
          { x: heap.x + KEEP_OFF, y: across },
          IN,
          Math.PI,
          SHORT,
        ),
      ],
      TIP_MS + spillMs + SETTLE_MS,
      dragMs,
      liftMs,
    );
    const swept = simulateSweep(sweep, spots);
    const mounds = heapSpots(
      { x: heap.x, y: heap.y + MOUND_H / 2 },
      BITS,
      MOUND_W,
      MOUND_H,
    );
    const gathered = sweep.endMs + GATHER_MS;
    const shovedAt = gathered + SHOVE_MS;
    const endAt = shovedAt + FADE_MS;

    const jar: Point = { x: button.x, y: 0 };
    const jarAt = (ms: number): Point | null => {
      if (ms < 0 || ms > TIP_MS) return null;
      const u = ms / TIP_MS;
      jar.y = button.y - HOP * Math.sin((Math.PI / 2) * u);
      return jar;
    };

    const tipping = createBeats(
      [TIP_MS],
      (ms) => ms,
      () => {
        cover!.burst(source, 0.7);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(TIP_SHAKE);
      },
    );
    const stroking = createBeats(
      sweep.starts,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(STROKE_SHAKE);
      },
    );
    const gathering = createBeats(
      [gathered],
      (ms) => ms,
      () => {
        cover!.burst(heap, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(GATHER_SHAKE);
      },
    );
    const shoving = createBeats(
      [shovedAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const broom: BroomState = {
      x: 0,
      y: 0,
      heading: 0,
      length: 0,
      pushing: false,
    };
    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          tipping.tick(ms, now);
          stroking.tick(ms, now);
          gathering.tick(ms, now);
          shoving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - shovedAt) / FADE_MS);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          for (let i = 0; i < BITS; i++) {
            if (ms < TIP_MS) break;
            if (ms < sweep.startMs) {
              const u = easeOut(
                clamp01((ms - TIP_MS) / (reaches[i] - TIP_MS + 200)),
              );
              bit.x = lerp([source.x, spots[i].x], u);
              bit.y = lerp([source.y, spots[i].y], u);
            } else if (ms < sweep.endMs) {
              swept.at(i, ms, bit);
            } else {
              const end = swept.end(i);
              const mound = mounds[i];
              const g = easeOut(clamp01((ms - sweep.endMs) / GATHER_MS));
              const s = easeIn(clamp01((ms - gathered) / SHOVE_MS));
              bit.x = lerp([lerp([end.x, mound.x], g), lock.x], s);
              bit.y = lerp([lerp([end.y, mound.y], g), lock.y], s);
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i * 1.1 + ms * 0.003,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          drawWispBetween(ctx, jarAt, ms, now, WISP_SIZE * JAR, 0.6, 0, TIP_MS);
          // faded in on its first stroke's start and out after its last
          const b = sweep.at(
            Math.min(Math.max(ms, sweep.startMs), sweep.endMs - 1),
            broom,
          );
          const shown =
            clamp01((ms - (sweep.startMs - FADE_MS)) / FADE_MS) *
            (1 - clamp01((ms - sweep.endMs) / FADE_MS));
          if (b) drawBroom(ctx, b, shown, ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
