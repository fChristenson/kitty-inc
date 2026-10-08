// the "Birthday Candles" event (wisp; worker perma tiers): it covers its
// crit, whose click freezes the screen while flame wisps pop up out of the
// clicked floor's button and land one on top of every worker, flickering
// like candles on a cake; then a gust wisp comes roaring across the screen
// and blows them out one after another, each flame streaking off with the
// wind and bursting with a pop and a jolt as its worker climbs a perma
// tier; the last one goes out in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "birthdayCandles";
const MAX_WORKERS = 6;
const ABOVE = 46;
const HOP = 90;
const BLOWN = 140;
const BLOW_MS = 160;
const FLAME = 0.35;
const GUST = 0.8;
const EDGE = 40;
const OUT_SHAKE: [number, number] = [0.5, 1.2];

export const forceBirthdayCandlesEvent = registerWispEvent(
  KEY,
  "Birthday Candles",
  () => CONFIG.birthdayCandlesEvent.chance,
  (floor, context, area) => {
    const { lightMs, flameMs, gustMs, holdMs, mergeMs } =
      CONFIG.birthdayCandlesEvent;
    const ltr = Math.random() < 0.5;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => (ltr ? a.at.x - b.at.x : b.at.x - a.at.x));
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const from = ltr ? area.left - EDGE : area.right + EDGE;
    const to = ltr ? area.right + EDGE : area.left - EDGE;
    const gustStarts = lightMs * workers.length + flameMs;
    const gustY =
      workers.reduce((s, w) => s + w.at.y, 0) / workers.length - ABOVE;
    const gustX = (ms: number) =>
      lerp(
        [from, to],
        easeIn(clamp01((ms - gustStarts) / gustMs)) * 0.6 +
          clamp01((ms - gustStarts) / gustMs) * 0.4,
      );
    const candles = workers.map((worker, k) => {
      const wick: Point = { x: worker.at.x, y: worker.at.y - ABOVE };
      const ctrl: Point = {
        x: (button.x + wick.x) / 2,
        y: Math.min(button.y, wick.y) - HOP,
      };
      const lights = k * lightMs;
      const lands = lights + lightMs * 1.6;
      // blown out once the gust reaches it
      const reach = clamp01((wick.x - from) / (to - from));
      let blows = gustStarts + gustMs;
      for (let ms = gustStarts; ms <= gustStarts + gustMs; ms += 4)
        if ((gustX(ms) - wick.x) * (ltr ? 1 : -1) >= 0) {
          blows = ms;
          break;
        }
      const away: Point = {
        x: wick.x + (ltr ? BLOWN : -BLOWN),
        y: wick.y - BLOWN * 0.3 * (0.5 + reach),
      };
      const pops = blows + BLOW_MS;
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        away,
        lights,
        pops,
        at: (ms: number): Point => {
          if (ms < lands)
            return bezier(
              button,
              ctrl,
              wick,
              easeOut(clamp01((ms - lights) / (lands - lights))),
              at,
            );
          if (ms < blows) {
            at.x = wick.x + Math.sin(ms / 45 + k) * 3;
            at.y = wick.y + Math.sin(ms / 70 + k * 2) * 4;
            return at;
          }
          const u = easeOut(clamp01((ms - blows) / BLOW_MS));
          at.x = lerp([wick.x, away.x], u);
          at.y = lerp([wick.y, away.y], u);
          return at;
        },
      };
    });
    const last = candles.reduce((a, b) => (b.pops > a.pops ? b : a));
    const endAt = Math.max(last.pops, gustStarts + gustMs);
    const gustAt: Point = { x: 0, y: gustY };
    const gust = (ms: number): Point => {
      gustAt.x = gustX(ms);
      gustAt.y = gustY + Math.sin(ms / 60) * 18;
      return gustAt;
    };

    const lighting = createBeats(
      candles,
      (c) => c.lights,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const gusting = createBeats(
      [gustStarts],
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(0.5);
      },
    );
    const popping = createBeats(
      candles,
      (c) => c.pops,
      (c, k) => {
        cover!.promote(c.worker);
        if (c === last) {
          cover!.blast(c.away);
          return;
        }
        cover!.burst(c.away, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(OUT_SHAKE, k / Math.max(1, candles.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          lighting.tick(ms, now);
          gusting.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const c of candles)
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * FLAME,
              1,
              c.lights,
              c.pops,
            );
          drawWispBetween(
            ctx,
            gust,
            ms,
            now,
            WISP_SIZE * GUST,
            0.3,
            gustStarts,
            gustStarts + gustMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
