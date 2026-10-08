// the "Vault Doors" event (experiment: the frozen screen opens like a vault;
// cash): it covers its crit, whose click freezes the screen and its two
// halves clunk as the bolts release, then slide apart like giant vault
// doors, revealing a blinding gold light behind them, and rivers of cash
// come flooding out of the gap into the total; then the doors slam shut
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "vaultDoors";
const REWARD = 4;
const CLUNKS = 3;
const OPEN = 0.42;
const RIVERS = 5;
const EDGE = 10;
const VOID = "rgba(0,0,0,0.85)";
const GLOW = fadeStops(COLOR.white, 0.2);
const GOLD = fadeStops(COLOR.heavenlyGold);

export const forceVaultDoorsEvent = registerWispEvent(
  KEY,
  "Vault Doors",
  () => CONFIG.vaultDoorsEvent.chance,
  (floor, context, area) => {
    const { clunkMs, openMs, floodMs, slamMs, holdMs, mergeMs } =
      CONFIG.vaultDoorsEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const total = totalSpot(area);
    const clunks = Array.from({ length: CLUNKS }, (_, k) => (k + 1) * clunkMs);
    const opensAt = CLUNKS * clunkMs + 60;
    const floodAt = opensAt + openMs * 0.5;
    const slamAt = floodAt + floodMs;
    const endAt = slamAt + slamMs;
    const gap = (ms: number) => {
      if (ms < opensAt) return 0;
      if (ms < slamAt)
        return OPEN * smoothstep(clamp01((ms - opensAt) / openMs));
      return OPEN * (1 - easeIn(clamp01((ms - slamAt) / slamMs)));
    };
    const rivers = Array.from({ length: RIVERS }, (_, i) => {
      const from: Point = {
        x: mid.x,
        y: lerp([top + height * 0.25, top + height * 0.85], i / (RIVERS - 1)),
      };
      const bow = (i - (RIVERS - 1) / 2) * 140;
      return sampleLine(
        (u): Point => ({
          x: lerp([from.x, total.x], u) + Math.sin(Math.PI * u) * bow,
          y: lerp([from.y, total.y], u),
        }),
        30,
      );
    });
    const pour: Pour = {
      coinsAlong: 220,
      width: 46,
      streamMs: floodMs * 0.7,
      travelMs: 520,
    };

    let shot: ScreenCopy | null = null;
    const beats = createBeats(
      [...clunks, floodAt, slamAt],
      (ms) => ms,
      (ms) => {
        if (ms === floodAt) {
          for (const line of rivers) pourLine(cover!, line, pour);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(ms === slamAt ? 2 : 0.7);
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
        tick: (ms, now) => {
          beats.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const g = gap(ms) * width;
          const half = width / 2;
          ctx.save();
          if (g > 0) {
            ctx.fillStyle = VOID;
            ctx.fillRect(mid.x - g, top, g * 2, height);
            ctx.globalCompositeOperation = "lighter";
            drawGlow(ctx, GOLD, mid.x, mid.y, g * 2.4, 2.2);
            drawGlow(ctx, GLOW, mid.x, mid.y, g * 1.2, 3);
            ctx.globalCompositeOperation = "source-over";
          }
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            half,
            height,
            left - g,
            top,
            half,
            height,
          );
          drawScreenPart(
            ctx,
            shot,
            mid.x,
            top,
            half,
            height,
            mid.x + g,
            top,
            half,
            height,
          );
          ctx.fillStyle = COLOR.heavenlyGold;
          ctx.fillRect(mid.x - g - EDGE, top, EDGE, height);
          ctx.fillRect(mid.x + g, top, EDGE, height);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
