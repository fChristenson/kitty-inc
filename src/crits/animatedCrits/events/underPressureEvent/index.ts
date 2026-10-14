// the "Under Pressure" event (crush; worker perma tiers): it covers its crit,
// whose click freezes the screen while hundreds of glitter specks scatter
// across it; two slabs of light slam in from the screen's sides like a vice,
// quicker and harder each, packing them into a tight column; a third lowers
// onto the column and pushes down without letting up, the column squashing,
// bulging and buckling, glitter oozing out, giving in jolts closer and
// closer until it crumbles, and a wisp flies out of the rubble onto each
// worker, striking it up a perma tier
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import {
  crumbleAt,
  crumbleFrom,
  crushAt,
  drawCrumbleDust,
  drawCrushContact,
  drawPressGrind,
  drawSlab,
  planCrush,
  planPress,
  pressAt,
  pressWarp,
  tickCrush,
  tickPress,
  type CrushPose,
  type PressPose,
  type PressWarp,
} from "../../../../shared/animationStyles/crush";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playExplosion } from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { findRewardWorkers } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "underPressure";
const MAX_WORKERS = 8;
// the specks: SPECKS over the screen's width and BAND of its height round
// its middle, scattering in over SCATTER_MS
const SPECKS = 220;
const BAND = 0.36;
const SCATTER_MS = 260;
const SPECK = 26;
// the vice: from GAP_FROM to GAP_TO of the screen's width either side, its
// slabs THICK, winding out LIFT, the slams' gaps closing
const GAP_FROM = 0.46;
const GAP_TO = 0.1;
const THICK = 64;
const LIFT = 0.18;
const SLAMS = 5;
const SLAM_GAPS: [number, number] = [320, 150];
const VICE_POWER: [number, number] = [0.6, 1.2];
// the press from the top, PRESS_GAP_MS after the vice, lowering over
// LOWER_MS from LOWER of the screen's height; the column buckling BEND
const PRESS_GAP_MS = 120;
const LOWER_MS = 220;
const LOWER = 0.25;
const PRESS_MS = 1300;
const GIVES = 5;
const BEND = 0.8;
const TREMBLE = 12;
const SAG = 40;
// the crumble, then a wisp out of it onto each worker, FLY_MS (EVERY_MS
// apart), bowed BOW of the screen's height up
const DUST = 0.5;
const FLY_MS = 420;
const EVERY_MS = 70;
const BOW = 0.25;
const WISP = WISP_SIZE * 1.4;
const TIER_BLAST = 90;
const CRUMBLE_BLAST = 360;
const TIER_SHAKE = 1;

export const forceUnderPressureEvent = registerWispEvent(
  KEY,
  "Under Pressure",
  () => CONFIG.underPressureEvent.chance,
  (floor, context, area) => {
    const { firstMs, holdMs, mergeMs } = CONFIG.underPressureEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const gapFrom = width * GAP_FROM;
    const gapTo = width * GAP_TO;
    const band = height * BAND;
    const bottom = mid.y + band / 2;
    const specks = Array.from({ length: SPECKS }, (_, i) => ({
      x: (hash01(i, 9100) * 2 - 1) * gapFrom,
      h: hash01(i, 9101),
    }));
    const vice = planCrush(firstMs + SCATTER_MS + 200, SLAMS, SLAM_GAPS, 1.4, {
      climaxShake: 1.8,
    });
    const viceEnd = vice.slams[SLAMS - 1];
    const press = planPress(
      viceEnd + PRESS_GAP_MS + LOWER_MS,
      PRESS_MS,
      GIVES,
      {
        depth: 1,
      },
    );
    const crumbleMs = press.crumbleMs;
    const warp: PressWarp = { a: 0, h: 0, turn: 0, widen: 1 };
    // where each speck sits as the press crumbles it, from the column's base
    const bits = crumbleFrom(
      specks.map((s) => {
        pressWarp(1, s.x / gapFrom, s.h, BEND, warp);
        return { x: warp.a * gapTo, y: -warp.h * band };
      }),
      gapTo,
      9110,
    );
    const base: Point = { x: mid.x, y: bottom };
    const rubble: Point = { x: mid.x, y: bottom - band * 0.3 };
    const flights = workers.map((worker, k) => {
      const start = crumbleMs + 80 + k * EVERY_MS;
      const land = start + FLY_MS;
      const spot: Point = { x: 0, y: 0 };
      return {
        worker,
        start,
        land,
        at: (ms: number): Point | null => {
          if (ms < start || ms > land) return null;
          const t = (ms - start) / (land - start);
          const to = worker.at;
          const cx = (rubble.x + to.x) / 2;
          const cy = Math.min(rubble.y, to.y) - height * BOW;
          const u = 1 - t;
          spot.x = u * u * rubble.x + 2 * u * t * cx + t * t * to.x;
          spot.y = u * u * rubble.y + 2 * u * t * cy + t * t * to.y;
          return spot;
        },
      };
    });
    const endMs = flights[flights.length - 1].land;
    const crushPose: CrushPose = {
      crush: 0,
      lift: 0,
      since: Infinity,
      press: -1,
    };
    const pressPose: PressPose = { crush: 0, strain: 0, since: Infinity };
    const shiver: Point = { x: 0, y: 0 };
    const speck: Point = { x: 0, y: 0 };
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const c: Point = { x: 0, y: 0 };
    const contact: Point = { x: 0, y: 0 };

    const landing = createBeats(
      flights,
      (f) => f.land,
      (f) => {
        cover!.promote(f.worker);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(TIER_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          if (cover?.isLive()) {
            tickCrush(vice, ms);
            if (ms >= press.startMs) tickPress(press, ms);
          }
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 400) return;
          crushAt(vice, ms, crushPose);
          pressAt(press, ms, pressPose);
          trembleAt(pressPose.strain, ms, TREMBLE, shiver);
          const gap = lerp([gapFrom, gapTo], crushPose.crush);
          const k = pressPose.crush;
          const crumbled = ms >= crumbleMs;
          const scatter = clamp01((ms - firstMs) / SCATTER_MS);
          const top = bottom - band * pressWarp(k, 0, 1, 0, warp).h;
          const sag = crumbled ? 0 : SAG * k;
          // the specks: packed by the vice, then warped by the press
          if (scatter > 0) {
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            beginLightBatch(ctx);
            for (let i = 0; i < specks.length; i++) {
              const s = specks[i];
              if (crumbled) {
                crumbleAt(bits[i], base, ms - crumbleMs, speck);
              } else {
                pressWarp(k, s.x / gapFrom, s.h, BEND, warp);
                speck.x = mid.x + warp.a * gap + shiver.x * 0.5;
                speck.y =
                  bottom -
                  warp.h * band +
                  sag * Math.max(0, 1 - Math.abs(warp.a)) * warp.h;
              }
              stampGlimmer(
                ctx,
                speck.x,
                speck.y,
                SPECK *
                  scatter *
                  (crumbled ? Math.max(0, 1 - (ms - crumbleMs) / 900) : 1),
                i,
                i % 3 ? COLOR.heavenlyGold : COLOR.white,
              );
            }
            endLightBatch(ctx);
            ctx.globalCompositeOperation = previous;
          }
          // the vice's slabs, sliding in from the screen's sides
          const viceIn = smoothstep(clamp01((ms - firstMs - SCATTER_MS) / 200));
          const viceAlpha = viceIn * (1 - clamp01((ms - crumbleMs) / 200));
          for (let side = -1; side <= 1; side += 2) {
            a.x = b.x =
              mid.x +
              side *
                (gap +
                  THICK / 2 +
                  crushPose.lift * width * LIFT +
                  (1 - viceIn) * width * 0.2);
            a.y = mid.y - band * 0.75;
            b.y = mid.y + band * 0.75;
            drawSlab(ctx, a, b, THICK, viceAlpha, now);
            if (crushPose.press >= 0 && ms < viceEnd + 300) {
              contact.x = mid.x + side * gap;
              contact.y = mid.y;
              drawCrushContact(
                ctx,
                contact,
                side < 0 ? 0 : Math.PI,
                band,
                crushPose.since,
                lerp(VICE_POWER, crushPose.press / (SLAMS - 1)),
                now,
              );
            }
          }
          // the press lowering onto the column, sagging, then driving through
          const lower = smoothstep(
            clamp01((ms - viceEnd - PRESS_GAP_MS) / LOWER_MS),
          );
          const through = smoothstep(clamp01((ms - crumbleMs) / 120));
          const y =
            lerp([top - height * LOWER, top], lower) +
            (bottom - top) * through -
            THICK / 2 +
            shiver.y;
          const pressAlpha =
            lower * (1 - clamp01((ms - crumbleMs - 120) / 200));
          a.x = mid.x - gapTo * 2.2 + shiver.x;
          b.x = mid.x + gapTo * 2.2 + shiver.x;
          c.x = mid.x + shiver.x;
          a.y = b.y = y;
          c.y = y + sag;
          drawSlab(ctx, a, c, THICK, pressAlpha, now);
          drawSlab(ctx, c, b, THICK, pressAlpha, now);
          if (ms >= press.startMs && !crumbled) {
            contact.x = mid.x + shiver.x;
            contact.y = top + sag;
            drawPressGrind(
              ctx,
              contact,
              Math.PI / 2,
              gapTo * 3,
              pressPose,
              ms,
              now,
            );
          }
          if (crumbled)
            drawCrumbleDust(ctx, base, width * DUST, ms - crumbleMs);
          drawDetonation(ctx, rubble, ms - crumbleMs, CRUMBLE_BLAST, now);
          for (const f of flights) {
            drawWispBetween(ctx, f.at, ms, now, WISP, 0.8, f.start, f.land);
            drawDetonation(ctx, f.worker.at, ms - f.land, TIER_BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
