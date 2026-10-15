// the "Tornado Alley" event (tornado; free upgrade levels): it covers its
// crit, whose click freezes the screen while a funnel of glitter touches down
// at the bottom corner of the screen and swells up the whole height of the
// building, its rings whirling faster and faster, the rumble rising; its foot
// tears across the bottom of the screen and back, quicker each way, and every
// bar its funnel sweeps has its glitter torn off with a pop and levels, spun
// up round it; then its foot swings under the clicked bar, it whips round
// flat out and flings everything back down onto the bars, a blast and levels
// on each, collapsing in a huge blast on the clicked one. Then the crit's
// tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import {
  drawTornado,
  flingFrom,
  funnelAt,
  liftAt,
  planTornado,
  tornadoGrow,
} from "../../../../shared/animationStyles/tornado";
import { clamp01, lerp, quicken } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { shakeScreen } from "../../../../shared/screenShake";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import type { Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "tornadoAlley";
// its foot runs along FOOT_UP of the screen's height over its bottom, from
// INSET of its width in at one side to the other, back, then under the
// clicked bar; the funnel HEIGHT of the screen tall, FOOT and TOP of its
// width round at its foot and top, swaying SWAY of its width
const FOOT_UP = 0.05;
const INSET = 0.12;
const BACK = 0.22;
const HEIGHT = 0.9;
const FOOT = 0.025;
const TOP = 0.3;
const SWAY = 0.05;
const GROW_MS = 400;
const SPIN_HZ: [number, number] = [0.7, 4.2];
// the run off at START of its average speed, quickening
const START = 0.45;
// the glitter on each bar: CATCH specks, SPECK px, across its box
const CATCH = 14;
const SPECK = 30;
const STEP_MS = 8;
// the rumble rising as it runs: a shake every RUMBLE_MS (closing)
const RUMBLE_MS: [number, number] = [170, 60];
const RUMBLE_SHAKE: [number, number] = [0.3, 1.1];
const CATCH_SHAKE = 0.7;
const LAND_SHAKE = 0.9;
const COLLAPSE_MS = 240;

interface Speck {
  bar: RewardBar;
  // its home on its bar
  home: Point;
  caughtMs: number;
  seed: number;
  landsMs: number;
}

export const forceTornadoAlleyEvent = registerWispEvent(
  KEY,
  "Tornado Alley",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      sweepMs,
      whipMs,
      flingMs,
      flingGapMs,
      levelShare,
      holdMs,
      mergeMs,
    } = meta.values;
    const bars = findRewardBars(floor, context);
    if (bars.length === 0) return;
    const clicked =
      bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const footY = area.bottom - height * FOOT_UP;
    const fromLeft = clicked.center.x > (area.left + area.right) / 2;
    const near = fromLeft
      ? area.left + width * INSET
      : area.right - width * INSET;
    const far = fromLeft
      ? area.right - width * INSET
      : area.left + width * INSET;
    const back = fromLeft
      ? area.left + width * BACK
      : area.right - width * BACK;
    const stops = [near, far, back, clicked.center.x];
    const legs = stops.slice(1).map((x, k) => Math.abs(x - stops[k]));
    const length = legs.reduce((a, b) => a + b, 0) || 1;
    const sweepEnd = firstMs + sweepMs;
    const flungMs = sweepEnd + whipMs;
    const foot = (ms: number, into: Point): Point => {
      let s = length * quicken(clamp01((ms - firstMs) / sweepMs), START);
      let k = 0;
      while (k < legs.length - 1 && s > legs[k]) s -= legs[k++];
      const u = Math.min(1, s / (legs[k] || 1));
      into.x = stops[k] + (stops[k + 1] - stops[k]) * u;
      into.y = footY;
      return into;
    };
    const tornado = planTornado(foot, {
      startMs: firstMs,
      endMs: flungMs,
      height: height * HEIGHT,
      foot: width * FOOT,
      top: width * TOP,
      spinHz: SPIN_HZ,
      sway: width * SWAY,
      growMs: GROW_MS,
    });

    // each speck caught the first time the funnel's ring at its height
    // sweeps over it; any it misses are torn off as it whips round
    const ring0: Point = { x: 0, y: 0 };
    const ring1: Point = { x: 0, y: 0 };
    const specks: Speck[] = [];
    bars.forEach((bar, b) => {
      for (let i = 0; i < CATCH; i++) {
        const home = {
          x: bar.box.x + bar.box.width * ((i + 0.5) / CATCH),
          y:
            bar.center.y + (hash01(i + b * CATCH, 3310) - 0.5) * bar.box.height,
        };
        let caughtMs = sweepEnd + hash01(i + b * CATCH, 3311) * whipMs * 0.8;
        for (let ms = firstMs; ms < sweepEnd; ms += STEP_MS) {
          const tall = tornado.height * tornadoGrow(tornado, ms);
          const h = (footY - home.y) / (tall || 1);
          if (h < 0 || h > 1) continue;
          funnelAt(tornado, ms, h, 0, ring0);
          funnelAt(tornado, ms, h, Math.PI, ring1);
          if (
            Math.abs(home.x - (ring0.x + ring1.x) / 2) <
            Math.abs(ring0.x - ring1.x) / 2
          ) {
            caughtMs = ms;
            break;
          }
        }
        specks.push({
          bar,
          home,
          caughtMs,
          seed: hash01(i + b * CATCH, 3312),
          landsMs: 0,
        });
      }
    });
    // flung back top bar first, the clicked bar last
    const order = bars.filter((b) => b !== clicked);
    order.push(clicked);
    const lands = new Map<RewardBar, number>();
    order.forEach((bar, k) =>
      lands.set(bar, flungMs + flingMs + k * flingGapMs),
    );
    for (const s of specks) s.landsMs = lands.get(s.bar)!;
    const endMs = lands.get(clicked)!;
    const catches = bars.map((bar) => {
      let first = Infinity;
      for (const s of specks)
        if (s.bar === bar && s.caughtMs < first) first = s.caughtMs;
      return { bar, ms: first };
    });
    const rumbles: number[] = [];
    for (let ms = firstMs; ms < flungMs; ) {
      rumbles.push(ms);
      ms += lerp(RUMBLE_MS, clamp01((ms - firstMs) / (flungMs - firstMs)));
    }

    const at: Point = { x: 0, y: 0 };
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (ms) => {
        if (!cover?.isLive()) return;
        shakeScreen(
          lerp(RUMBLE_SHAKE, clamp01((ms - firstMs) / (flungMs - firstMs))),
        );
      },
    );
    const catching = createBeats(
      catches,
      (c) => c.ms,
      (c) => {
        foot(c.ms, at);
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 1), at);
        cover!.burst(c.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CATCH_SHAKE);
      },
    );
    const landing = createBeats(
      order,
      (bar) => lands.get(bar)!,
      (bar) => {
        foot(flungMs, at);
        at.y -= tornado.height * 0.5;
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), at);
        if (bar === clicked) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(bar.center, 0.8);
        if (cover!.isLive()) shakeScreen(LAND_SHAKE);
      },
    );

    const spot: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          catching.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < firstMs || ms > endMs + COLLAPSE_MS) return;
          drawTornado(
            ctx,
            tornado,
            Math.min(ms, flungMs),
            1 - clamp01((ms - flungMs) / COLLAPSE_MS),
          );
          // the glitter: lying on its bar, spun up the funnel, or flung back
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < specks.length; i++) {
            const s = specks[i];
            if (ms >= s.landsMs) continue;
            if (ms < s.caughtMs) {
              spot.x = s.home.x;
              spot.y = s.home.y;
            } else if (ms < flungMs) {
              liftAt(tornado, ms, s.caughtMs, s.seed, spot);
            } else {
              flingFrom(
                tornado,
                flungMs,
                Math.min(s.caughtMs, flungMs),
                s.seed,
                s.home,
                clamp01((ms - flungMs) / (s.landsMs - flungMs)),
                spot,
              );
            }
            stampGlimmer(
              ctx,
              spot.x,
              spot.y,
              SPECK,
              i,
              i % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
