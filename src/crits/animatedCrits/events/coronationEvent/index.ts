// the "Coronation" event (drawing; a free floor): it covers its crit, whose
// click freezes the screen while glitter tears off every bar in view and
// flies up in waves, quicker and quicker, each wave a click and a jolt,
// landing dot by dot into a giant crown in the middle of the screen; the
// crown blazes, then drops onto the dark locked floor faster and faster and
// crowns it, bursting it open, unlocked for free as the screen unfreezes
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import {
  drawDots,
  SHAPES,
  shapeFill,
} from "../../../../shared/animationStyles/drawing";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  playBarExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import type { Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { findRewardBars, findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "coronation";
// the crown: DOTS dots filling it, SIZE px from its middle to its edge
const DOTS = 240;
const SIZE = 260;
const DOT = 24;
// the waves: WAVES of them, the dots of each flying FLY_MS from their bar,
// STAGGER_MS apart, bowed LIFT px up; the gaps between waves closing
const WAVES = 6;
const FLY_MS = 320;
const STAGGER_MS = 3;
const LIFT = 160;
const SPREAD = 260;
const WAVE_SHAKE: [number, number] = [0.5, 1.2];
// the blaze, then the drop onto the locked floor, faster and faster
const BLAZE_GAP_MS = 120;
const BLAZE_MS = 320;
const BLAZE_SHAKE = 1.6;
const DROP_MS = 260;
const LAND_SHAKE = 3;
const WAVE_BLAST = 80;
const CROWN = shapeFill(SHAPES.crown, DOTS, { x: 0, y: 0 }, SIZE);

export const forceCoronationEvent = registerWispEvent(
  KEY,
  "Coronation",
  () => CONFIG.coronationEvent.chance,
  (floor, context, area) => {
    const { firstMs, gapsMs, holdMs, mergeMs } = CONFIG.coronationEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const middle: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const crown = CROWN;
    const bars = findRewardBars(floor, context);
    const waves: number[] = [];
    let t = firstMs;
    for (let w = 0; w < WAVES; w++) {
      waves.push(t);
      t += lerp(gapsMs, w / (WAVES - 1));
    }
    // each dot torn off a bar (or the screen's bottom) and flown in its wave
    const flights = crown.map((to, i) => {
      const wave = Math.floor((i / crown.length) * WAVES);
      const bar = bars.length > 0 ? bars[i % bars.length] : null;
      const from: Point = bar
        ? {
            x: bar.center.x + (hash01(i, 7300) * 2 - 1) * SPREAD,
            y: bar.center.y,
          }
        : {
            x: lerp([area.left, area.right], hash01(i, 7300)),
            y: area.bottom,
          };
      const start = waves[wave] + (i % (crown.length / WAVES)) * STAGGER_MS;
      return { from, to, start, land: start + FLY_MS };
    });
    const landed = Math.max(...flights.map((f) => f.land));
    const waveLands = waves.map((at) => at + FLY_MS);
    const blazeAt = landed + BLAZE_GAP_MS;
    const dropAt = blazeAt + BLAZE_MS;
    const landAt = dropAt + DROP_MS;

    const clicking = createBeats(
      waveLands,
      (at) => at,
      (_, w) => {
        if (!cover?.isLive()) return;
        playBarExplosion(lerp([0.8, 1.2], w / (WAVES - 1)));
        shakeScreen(lerp(WAVE_SHAKE, w / (WAVES - 1)));
      },
    );
    const finale = createBeats(
      [blazeAt, landAt],
      (at) => at,
      (_, k) => {
        if (k === 1) {
          cover!.blast(lock);
          if (cover!.isLive()) shakeScreen(LAND_SHAKE);
          return;
        }
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(BLAZE_SHAKE);
      },
    );
    const at: Point = { x: 0, y: 0 };
    // the landed dots in the order they land, so drawDots shows the first n
    const landedOrder = flights
      .map((f, i) => ({ land: f.land, i }))
      .sort((a, b) => a.land - b.land)
      .map(({ i }) => crown[i]);

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: landAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          clicking.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > landAt + 900) return;
          // the crown's middle: in the screen's middle, then dropping
          const drop = clamp01((ms - dropAt) / DROP_MS) ** 2;
          const cx = lerp([middle.x, lock.x], drop);
          const cy = lerp([middle.y, lock.y], drop);
          if (ms < landAt) {
            // the dots that have landed, blazing once the crown is whole
            let count = 0;
            for (const f of flights) if (ms >= f.land) count++;
            const blaze = clamp01((ms - blazeAt) / BLAZE_MS);
            ctx.save();
            ctx.translate(cx, cy);
            drawDots(ctx, landedOrder, count, DOT, ms, blaze);
            ctx.restore();
            // the dots in flight
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            beginLightBatch(ctx);
            for (let i = 0; i < flights.length; i++) {
              const f = flights[i];
              if (ms < f.start || ms >= f.land) continue;
              const u = (ms - f.start) / FLY_MS;
              const e = u * u;
              at.x = lerp([f.from.x, cx + f.to.x], e);
              at.y =
                lerp([f.from.y, cy + f.to.y], e) - LIFT * Math.sin(Math.PI * u);
              stampGlimmer(
                ctx,
                at.x,
                at.y,
                DOT * (1.3 - 0.3 * u),
                i,
                i % 3 ? COLOR.heavenlyGold : COLOR.white,
              );
            }
            endLightBatch(ctx);
            ctx.globalCompositeOperation = previous;
          }
          for (let w = 0; w < WAVES; w++) {
            at.x = cx;
            at.y = cy;
            drawDetonation(ctx, at, ms - waveLands[w], WAVE_BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
