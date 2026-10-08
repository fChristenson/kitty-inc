// the "Blast Off" event (experiment: the whole screen launches like a
// rocket; cash): it covers its crit, whose click freezes the screen and the
// frame shudders harder and harder on its launch pad, rumbling and jolting;
// then it blasts off straight up out of view on a roaring column of blasts
// and fountains of cash, leaving a dark gold-lit void; then it falls back
// down and slams home in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { pourLine, sampleLine, type Pour } from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "blastOff";
const REWARD = 4;
const RUMBLES = 6;
const JITTER: [number, number] = [3, 16];
const JETS = 5;
const JET_FAN = 0.5;
const EXHAUST = 8;
const EXHAUST_GAP_MS = 45;
const EXHAUST_SIZE = 220;
const VOID = "rgba(0,0,0,0.9)";
const GLOW = fadeStops(COLOR.heavenlyGold);
const RUMBLE_SHAKE: [number, number] = [0.3, 0.9];

export const forceBlastOffEvent = registerWispEvent(
  KEY,
  "Blast Off",
  () => CONFIG.blastOffEvent.chance,
  (floor, context, area) => {
    const { shudderMs, launchMs, awayMs, dropMs, holdMs, mergeMs } =
      CONFIG.blastOffEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid = { x: left + width / 2, y: top + height / 2 };
    const pad: Point = { x: mid.x, y: area.bottom - 30 };
    const dropsAt = shudderMs + launchMs + awayMs;
    const endAt = dropsAt + dropMs;
    const rumbles = Array.from(
      { length: RUMBLES },
      (_, k) => shudderMs * Math.sqrt((k + 1) / (RUMBLES + 1)),
    );
    const exhausts = Array.from({ length: EXHAUST }, (_, k) => ({
      at: { x: pad.x + (k % 2 === 0 ? -1 : 1) * (k * 18), y: pad.y - k * 30 },
      ms: shudderMs + k * EXHAUST_GAP_MS,
    }));
    const jets = Array.from({ length: JETS }, (_, j) => {
      const a = -Math.PI / 2 + (j / (JETS - 1) - 0.5) * JET_FAN;
      const reach = height * 0.85;
      return sampleLine(
        (u): Point => ({
          x: pad.x + Math.cos(a) * reach * u,
          y: pad.y + Math.sin(a) * reach * u + 120 * u * u,
        }),
        30,
      );
    });
    const pour: Pour = {
      coinsAlong: 180,
      width: 40,
      streamMs: launchMs + awayMs * 0.6,
      travelMs: 520,
    };
    const lift = (ms: number) => {
      if (ms < shudderMs) return 0;
      if (ms < shudderMs + launchMs)
        return -easeIn(clamp01((ms - shudderMs) / launchMs));
      if (ms < dropsAt) return -1;
      return -1 + easeIn(clamp01((ms - dropsAt) / dropMs));
    };

    let shot: ScreenCopy | null = null;
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive()) shakeScreen(lerp(RUMBLE_SHAKE, k / (RUMBLES - 1)));
      },
    );
    const blasting = createBeats(
      exhausts,
      (e) => e.ms,
      (_, k) => {
        if (k === 0) for (const line of jets) pourLine(cover!, line, pour);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(k === 0 ? 2 : 1);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(mid),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          blasting.tick(ms, now);
          finale.tick(ms, now);
        },
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
          ctx.globalAlpha = 0.7;
          drawGlow(ctx, GLOW, pad.x, pad.y, width * 0.6, 0.7);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          const shudder =
            ms < shudderMs
              ? Math.sin(ms * 0.9) * lerp(JITTER, ms / shudderMs)
              : 0;
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            left + shudder,
            top + lift(ms) * height,
            width,
            height,
          );
          ctx.restore();
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= endAt) return;
          for (const e of exhausts)
            drawDetonation(ctx, e.at, ms - e.ms, EXHAUST_SIZE, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
