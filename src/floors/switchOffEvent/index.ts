// the "Switch Off" event (experiment: the screen switches off like an old
// TV; cash): it covers its crit, whose click freezes the screen and the
// whole of it squashes flat into a blazing white line across the dark, then
// shrinks to a single white-hot dot that swells and flares, and the dot
// explodes in a colossal blast and shake, flinging a ring of cash and
// rivers of it curling into the total as the screen pops back on. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { drawDetonation } from "../../shared/explosion";
import { bezier } from "../../shared/curves";
import { pourLine, sampleLine, totalSpot, type Pour } from "../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "switchOff";
const REWARD = 4;
const VOID = "rgb(0,0,0)";
const WHITE = "rgb(255,255,255)";
const LINE = 6;
const DOT = 10;
const DOT_GLOW = fadeStops(COLOR.white, 0.3);
const GOLD_GLOW = fadeStops(COLOR.heavenlyGold);
const SWELL = 120;
const RIVERS = 6;
const RIVER_REACH = 420;
const RING = 50;
const COLOSSAL = 560;
// the share of the switch-on spent opening the line before the height
const ON_SPLIT = 0.4;
const THUNK_SHAKE = 0.6;
const POP_SHAKE = 2.6;

export const forceSwitchOffEvent = registerWispEvent(
  KEY,
  "Switch Off",
  () => CONFIG.switchOffEvent.chance,
  (floor, context, area) => {
    const { squashMs, shrinkMs, swellMs, onMs, holdMs, mergeMs } =
      CONFIG.switchOffEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const dotAt = squashMs + shrinkMs;
    const popsAt = dotAt + swellMs;
    const onAt = popsAt + onMs;
    // the screen's size and how white-hot it glows at ms
    const shape = { w: width, h: height, white: 0 };
    const shapeAt = (ms: number) => {
      if (ms < squashMs) {
        const u = easeIn(clamp01(ms / squashMs));
        shape.w = width;
        shape.h = lerp([height, LINE], u);
        shape.white = u;
      } else if (ms < popsAt) {
        const u = easeIn(clamp01((ms - squashMs) / shrinkMs));
        shape.w = lerp([width, DOT], u);
        shape.h = LINE;
        shape.white = 1;
      } else {
        const u = clamp01((ms - popsAt) / onMs);
        const open = easeOut(clamp01(u / ON_SPLIT));
        const tall = easeOut(clamp01((u - ON_SPLIT) / (1 - ON_SPLIT)));
        shape.w = lerp([DOT, width], open);
        shape.h = lerp([LINE, height], tall);
        shape.white = 1 - u;
      }
      return shape;
    };
    const rivers = Array.from({ length: RIVERS }, (_, i) => {
      const angle = (i / RIVERS) * Math.PI * 2 + 0.3;
      const out: Point = {
        x: mid.x + Math.cos(angle) * RIVER_REACH,
        y: mid.y + Math.sin(angle) * RIVER_REACH,
      };
      const into: Point = { x: 0, y: 0 };
      return sampleLine((u) => ({ ...bezier(mid, out, total, u, into) }), 30);
    });
    const pour: Pour = {
      coinsAlong: 170,
      width: 34,
      streamMs: 380,
      travelMs: 720,
    };

    let shot: ScreenCopy | null = null;
    const thunking = createBeats(
      [squashMs],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(THUNK_SHAKE);
      },
    );
    const popping = createBeats(
      [popsAt],
      (ms) => ms,
      () => {
        for (const line of rivers) pourLine(cover!, line, pour);
        cover!.launchFrom(
          mid,
          clampTargetsY(
            ringTargets(mid, RING, [140, 360]),
            top + 40,
            area.bottom - 40,
          ),
        );
        cover!.blast(mid);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(POP_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: popsAt + pour.streamMs + pour.travelMs + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          thunking.tick(ms, now);
          popping.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= onAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const { w, h, white } = shapeAt(Math.max(0, ms));
          const x = mid.x - w / 2;
          const y = mid.y - h / 2;
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          drawScreenPart(ctx, shot, left, top, width, height, x, y, w, h);
          if (white > 0) {
            ctx.globalAlpha = white;
            ctx.fillStyle = WHITE;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1;
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms < squashMs * 0.6 || ms > popsAt + 900) return;
          if (ms < popsAt) {
            ctx.globalCompositeOperation = "lighter";
            if (ms < dotAt) {
              // the line's glare, shrinking with it
              const r = Math.max(40, shapeAt(ms).w * 0.55);
              drawGlow(ctx, GOLD_GLOW, mid.x, mid.y, r, 36 / r);
              drawGlow(ctx, DOT_GLOW, mid.x, mid.y, r * 0.9, 14 / r);
            } else {
              // the dot, swelling white-hot
              const swell = clamp01((ms - dotAt) / swellMs);
              const r = lerp([40, SWELL], swell * swell);
              drawGlow(ctx, GOLD_GLOW, mid.x, mid.y, r * 2);
              drawGlow(ctx, DOT_GLOW, mid.x, mid.y, r);
            }
            ctx.globalCompositeOperation = "source-over";
            return;
          }
          // the copy hides the cover's own blast, so the pop is drawn on top
          drawDetonation(ctx, mid, ms - popsAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
