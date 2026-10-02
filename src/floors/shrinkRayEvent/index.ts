// the "Shrink Ray" event (an experiment beyond the six templates: the frozen
// screen shrinks away; a crit tier): it covers its crit, whose click freezes
// the screen while a ray zaps it from the corner, again and again, each zap a
// crackle, a jolt and a ring of coins as the whole screen snaps smaller and
// smaller into the middle of the dark; then it springs back to full size in a
// white flash and a huge blast and shake, and the clicked floor's income bar
// jumps one crit tier. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { ringTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";
import { findRewardBars } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "shrinkRay";
// the screen's size after each zap
const SIZES = [0.72, 0.46, 0.22];
const SNAP_MS = 180;
const RAY_MS = 140;
const RAY = 16;
const BEHIND = "#07050D";
const ZAP_COINS = 10;
const ZAP_SHAKE: [number, number] = [0.8, 1.5];

export const forceShrinkRayEvent = registerWispEvent(
  KEY,
  "Shrink Ray",
  () => CONFIG.shrinkRayEvent.chance,
  (floor, context, area) => {
    const { zapsMs, smallMs, popMs, holdMs, mergeMs } = CONFIG.shrinkRayEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!own) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const corner: Point = { x: area.left - 40, y: area.top - 40 };
    const popAt = zapsMs[zapsMs.length - 1] + smallMs;
    const endAt = popAt + popMs;
    const sizeAt = (ms: number): number => {
      if (ms >= popAt)
        return lerp(
          [SIZES[SIZES.length - 1], 1],
          easeOutBack(clamp01((ms - popAt) / popMs)),
        );
      let size = 1;
      zapsMs.forEach((at, k) => {
        if (ms >= at)
          size = lerp(
            [k === 0 ? 1 : SIZES[k - 1], SIZES[k]],
            easeOutBack(clamp01((ms - at) / SNAP_MS)),
          );
      });
      return size;
    };

    let shot: ScreenCopy | null = null;
    const zapping = createBeats(
      zapsMs,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, zapsMs.length - 1);
        const r = (Math.min(width, height) * SIZES[k]) / 2;
        cover!.launchFrom(centre, ringTargets(centre, ZAP_COINS, [r, r + 120]));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ZAP_SHAKE, t));
      },
    );
    const popping = createBeats(
      [popAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own);
        cover!.slam(own);
        cover!.blast(centre);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [own],
        tick: (ms, now) => {
          zapping.tick(ms, now);
          popping.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const size = sizeAt(ms);
          const w = width * size;
          const h = height * size;
          ctx.save();
          ctx.fillStyle = BEHIND;
          ctx.fillRect(area.left, area.top, width, height);
          drawScreenPart(
            ctx,
            shot,
            area.left,
            area.top,
            width,
            height,
            centre.x - w / 2,
            centre.y - h / 2,
            w,
            h,
          );
          ctx.restore();
        },
        drawOver: (ctx, ms, now) => {
          for (const at of zapsMs) {
            const since = ms - at;
            if (since < 0 || since >= RAY_MS) continue;
            const fade = 1 - since / RAY_MS;
            drawBeam(ctx, corner, centre, RAY * fade, fade);
            drawBeamFlare(ctx, centre, 40 * fade, fade, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
