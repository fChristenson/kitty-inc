// the "Gravity Flip" event (experiment: gravity turns upside down; cash): it
// covers its crit, whose click freezes the screen and gravity flips: the
// whole frozen screen falls UP off the top like a dropped picture, leaving
// a dark gold-lit void, and a great sheet of coins pours up out of the
// bottom edge, piling against the ceiling with a crash and a jolt; then
// gravity flips back and the screen drops back down into place, slamming
// home in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { hash01 } from "../../../../shared/twinkle";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "gravityFlip";
const REWARD = 4;
const COINS = 160;
const CEILING = 70;
const PILE = 150;
const SWAY = 30;
const VOID = "rgba(0,0,0,0.9)";
const GLOW = fadeStops(COLOR.heavenlyGold);

export const forceGravityFlipEvent = registerWispEvent(
  KEY,
  "Gravity Flip",
  () => CONFIG.gravityFlipEvent.chance,
  (floor, context, area) => {
    const { fallMs, riseMs, hangMs, dropMs, holdMs, mergeMs } =
      CONFIG.gravityFlipEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid = { x: left + width / 2, y: top + height / 2 };
    const pileAt = fallMs * 0.4 + riseMs;
    const dropsAt = pileAt + hangMs;
    const endAt = dropsAt + dropMs;
    // where the frozen screen sits, from in place (0) up off the top (-1)
    const lift = (ms: number) => {
      if (ms < fallMs) return -easeIn(clamp01(ms / fallMs));
      if (ms < dropsAt) return -1;
      return -1 + easeIn(clamp01((ms - dropsAt) / dropMs));
    };
    const paths = Array.from({ length: COINS }, (_, i) => {
      const x = left + width * hash01(i, 1);
      const stop = top + CEILING + PILE * hash01(i, 2) ** 2;
      const delay = hash01(i, 3) * 0.3;
      const phase = hash01(i, 4) * Math.PI * 2;
      return (f: number) => {
        const u = easeIn(clamp01((f - delay) / (1 - delay)));
        return {
          x: x + Math.sin(phase + u * 6) * SWAY * (1 - u),
          y: lerp([area.bottom + 40, stop], u),
          scale: f < delay ? 0 : 1,
        };
      };
    });

    let shot: ScreenCopy | null = null;
    const beats = createBeats(
      [fallMs * 0.4, pileAt, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 0) {
          cover!.trace(paths, riseMs);
          return;
        }
        if (k === 2) {
          cover!.blast(mid);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.3);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => beats.tick(ms, now),
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.6;
          drawGlow(ctx, GLOW, mid.x, area.bottom, width * 0.7, 0.6);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          const dy = lift(ms) * height;
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            left,
            top + dy,
            width,
            height,
          );
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
