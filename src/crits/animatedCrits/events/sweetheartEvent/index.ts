// the "Sweetheart" event (drawing; worker perma tiers): it covers its crit,
// whose click freezes the screen while a pen wisp swoops in and draws a
// giant heart in glitter across it, dot after dot left glinting behind its
// tip, quicker and quicker, every stretch a click and a jolt; the heart
// closes up, blazes and beats twice, then bursts, its dots arcing down onto
// the workers in showers, each climbing a perma tier as its shower lands.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawDots,
  penOrder,
  shapeOutline,
  SHAPES,
} from "../../../../shared/drawing";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "sweetheart";
const MAX_WORKERS = 6;
const DOTS = 170;
const DOT = 12;
const PEN = WISP_SIZE * 0.8;
// the heart's size as a share of the screen's width (at most SIZE px)
const WIDTH = 0.34;
const SIZE = 260;
const CLICK_EVERY = 14;
const BEATS = 2;
const BEAT_MS = 180;
const BEAT_SWELL = 0.18;
const BOW = 180;
const DRAW_SHAKE: [number, number] = [0.15, 0.45];
const BEAT_SHAKE = 0.8;
const LAND_SHAKE = 0.5;
const SOUND_GAP_MS = 60;

export const forceSweetheartEvent = registerWispEvent(
  KEY,
  "Sweetheart",
  () => CONFIG.sweetheartEvent.chance,
  (floor, context, area) => {
    const { drawMs, burstMs, gapMs, holdMs, mergeMs } = CONFIG.sweetheartEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const size = Math.min(SIZE, (area.right - area.left) * WIDTH);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(area.top + size + 20, lerp([area.top, area.bottom], 0.36)),
    };
    const entry: Point = { x: area.right + 80, y: area.top - 80 };
    const dots = penOrder(shapeOutline(SHAPES.heart, DOTS, centre, size), {
      x: centre.x,
      y: centre.y - size,
    });
    // each dot laid as the pen passes, quickening
    const laid = dots.map((_, i) => drawMs * (1 - (1 - (i + 1) / DOTS) ** 1.5));
    const closedAt = laid[laid.length - 1];
    const beats = Array.from(
      { length: BEATS },
      (_, k) => closedAt + 120 + k * BEAT_MS * 1.6,
    );
    const burstAt = beats[beats.length - 1] + BEAT_MS;

    // the heart bursts into showers, one per worker
    const showers = dots.map((from, i) => {
      const worker = workers[i % workers.length];
      const k = i % workers.length;
      const leaves = burstAt + k * gapMs + Math.random() * gapMs * 0.5;
      return {
        from,
        worker,
        leaves,
        lands: leaves + burstMs,
        bow: {
          x: (from.x + worker.at.x) / 2 + (Math.random() - 0.5) * BOW,
          y: Math.min(from.y, worker.at.y) - BOW,
        },
      };
    });
    const firstLands = workers.map((w) =>
      Math.min(...showers.filter((s) => s.worker === w).map((s) => s.lands)),
    );
    const endMs = Math.max(...showers.map((s) => s.lands));
    const lastWorker = workers[firstLands.indexOf(Math.max(...firstLands))];
    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const drawing = createBeats(
      laid.filter((_, i) => i % CLICK_EVERY === CLICK_EVERY - 1),
      (ms) => ms,
      (_, k, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(DRAW_SHAKE, (k * CLICK_EVERY) / DOTS));
        sound(now);
      },
    );
    const beating = createBeats(
      [...beats, burstAt],
      (ms) => ms,
      (ms) => {
        if (ms === burstAt) cover!.burst(centre, 1.2);
        if (!cover!.isLive()) return;
        if (ms === burstAt) playSwoosh();
        else playBloop();
        shakeScreen(BEAT_SHAKE);
      },
    );
    const landing = createBeats(
      workers,
      (_, k) => firstLands[k],
      (worker, _, now) => {
        cover!.promote(worker);
        if (worker === lastWorker) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        sound(now);
      },
    );

    // the pen between the dot it last laid and the next
    const pen: Point = { x: 0, y: 0 };
    const penAt = (ms: number): Point | null => {
      if (ms > closedAt) return null;
      let i = 0;
      while (i < DOTS - 1 && laid[i] <= ms) i++;
      const from = i === 0 ? entry : dots[i - 1];
      const start = i === 0 ? 0 : laid[i - 1];
      const u = clamp01((ms - start) / (laid[i] - start));
      pen.x = lerp([from.x, dots[i].x], u);
      pen.y = lerp([from.y, dots[i].y], u);
      return pen;
    };
    const flying: Point = { x: 0, y: 0 };
    const beatAt = (ms: number) => {
      let swell = 0;
      for (const b of beats) {
        const t = (ms - b) / BEAT_MS;
        if (t > 0 && t < 1) swell = Math.max(swell, Math.sin(t * Math.PI));
      }
      return 1 + BEAT_SWELL * swell;
    };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          drawing.tick(ms, now);
          beating.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          if (ms < burstAt) {
            let count = 0;
            while (count < DOTS && laid[count] <= ms) count++;
            const swell = beatAt(ms);
            ctx.save();
            ctx.translate(centre.x, centre.y);
            ctx.scale(swell, swell);
            ctx.translate(-centre.x, -centre.y);
            drawDots(ctx, dots, count, DOT, ms, clamp01((ms - closedAt) / 150));
            ctx.restore();
            drawWisp(ctx, penAt, ms, now, PEN, 1);
            return;
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < DOTS; i++) {
            const s = showers[i];
            if (ms >= s.lands) continue;
            if (ms < s.leaves) {
              flying.x = s.from.x;
              flying.y = s.from.y;
            } else
              bezier(
                s.from,
                s.bow,
                s.worker.at,
                easeIn((ms - s.leaves) / burstMs),
                flying,
              );
            stampGlimmer(
              ctx,
              flying.x,
              flying.y,
              DOT * 1.3,
              i + ms * 0.005,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
