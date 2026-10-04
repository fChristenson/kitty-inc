// the "Butterfingers" event (mix; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while cash pours out of the
// clicked floor's button onto a tray held high by a waiter wisp, heaping up
// into a wobbling mound; the waiter sets off across the screen, weaving and
// teetering, the heap swaying wilder with every step, until it trips and
// the whole lot flies off in a great spill across the income bars, each
// jolting with free levels as the cash crashes down on it, the last in a
// huge blast and shake. Pays floor income × floor number × REWARD, plus the
// levels
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "butterfingers";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 520;
const COIN = 0.5;
// the heap sits this high over the waiter, this wide and tall
const TRAY = 70;
const HEAP_W = 120;
const HEAP_H = 90;
const SWAY = 40;
const WEAVE = 60;
const HEIGHT = 0.62;
const LIFT: [number, number] = [120, 320];
const WAITER = 0.7;
const SPILL_SHAKE: [number, number] = [0.6, 1.3];

export const forceButterfingersEvent = registerWispEvent(
  KEY,
  "Butterfingers",
  () => CONFIG.butterfingersEvent.chance,
  (floor, context, area) => {
    const { pourMs, walkMs, spillMs, levelShare, holdMs, mergeMs } =
      CONFIG.butterfingersEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const y = area.top + (area.bottom - area.top) * HEIGHT;
    const from: Point = { x: area.left + width * 0.12, y };
    const to: Point = { x: area.left + width * 0.62, y };
    const tripsAt = pourMs + walkMs;
    const waiter: Point = { x: 0, y: 0 };
    // weaving across, then lurching forward as it trips
    const waiterAt = (ms: number): Point => {
      const u = clamp01((ms - pourMs) / walkMs);
      waiter.x = lerp([from.x, to.x], u);
      waiter.y =
        y +
        Math.sin(u * Math.PI * 3) * WEAVE * u +
        Math.abs(Math.sin(ms * 0.02)) * -8 * (u > 0 && u < 1 ? 1 : 0);
      if (ms > tripsAt) {
        const t = easeOut(clamp01((ms - tripsAt) / 220));
        waiter.x += t * 90;
        waiter.y += t * 60;
      }
      return waiter;
    };
    const swayAt = (ms: number) =>
      Math.sin(ms * 0.012) * SWAY * clamp01((ms - pourMs) / walkMs) ** 1.5;
    // the spill lands spread across the bars (or the screen with none in view)
    const landing = (): { at: Point; bar: RewardBar | null } => {
      const bar = bars.length
        ? bars[Math.floor(Math.random() * bars.length)]
        : null;
      return bar
        ? {
            at: {
              x: bar.box.x + Math.random() * bar.box.width,
              y: bar.center.y + (Math.random() - 0.5) * bar.box.height,
            },
            bar,
          }
        : {
            at: {
              x: area.left + Math.random() * width,
              y: area.top + (area.bottom - area.top) * between([0.2, 0.8]),
            },
            bar: null,
          };
    };
    const drops = Array.from({ length: COINS }, (_, i) => ({
      ...landing(),
      i,
    }));
    const lands = (i: number) =>
      tripsAt + spillMs * (0.55 + 0.45 * (i / COINS));
    const travel = tripsAt + spillMs + 60;
    const paths: CoinPath[] = drops.map((drop) => {
      // a spot in the heap's mound
      const u = Math.random() * 2 - 1;
      const dx = u * HEAP_W;
      const dy = -Math.random() * HEAP_H * Math.sqrt(1 - u * u);
      const joins = (drop.i / COINS) * pourMs;
      const leaves = tripsAt + Math.random() * 120;
      const arrives = lands(drop.i);
      const lift = lerp(LIFT, Math.random());
      const heap = { x: 0, y: 0 };
      return (f: number) => {
        const ms = f * travel;
        if (ms < joins) return { x: button.x, y: button.y, scale: 0 };
        const w = waiterAt(Math.min(ms, leaves));
        const tilt = -dy / HEAP_H;
        heap.x = w.x + dx + swayAt(Math.min(ms, leaves)) * tilt;
        heap.y = w.y - TRAY + dy;
        if (ms < joins + 240) {
          const t = easeOut((ms - joins) / 240);
          return {
            x: lerp([button.x, heap.x], t),
            y: lerp([button.y, heap.y], t),
            scale: COIN * t,
          };
        }
        if (ms < leaves) return { x: heap.x, y: heap.y, scale: COIN };
        const t = clamp01((ms - leaves) / (arrives - leaves));
        return {
          x: lerp([heap.x, drop.at.x], t),
          y: lerp([heap.y, drop.at.y], easeIn(t)) - 4 * lift * t * (1 - t),
          scale: COIN,
        };
      };
    });
    // each bar jolts as the bulk of its share crashes down
    const hits = bars
      .map((bar) => {
        const mine = drops
          .filter((d) => d.bar === bar)
          .map((d) => lands(d.i))
          .sort((a, b) => a - b);
        return {
          bar,
          ms: mine.length
            ? mine[Math.floor(mine.length / 2)]
            : tripsAt + spillMs,
        };
      })
      .sort((a, b) => a.ms - b.ms);
    const last = hits[hits.length - 1];

    const tripping = createBeats(
      [tripsAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(0.5);
      },
    );
    const crashing = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.levels(
          h.bar,
          levelsFor(h.bar.floor, levelShare, 2),
          h.bar.center,
        );
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPILL_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const finishing = createBeats(
      bars.length ? [] : [travel],
      (ms) => ms,
      () =>
        cover!.blast(
          cover!.total() ?? { x: area.left + width / 2, y: area.top + 90 },
        ),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          tripping.tick(ms, now);
          crashing.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            waiterAt,
            ms,
            now,
            WISP_SIZE * WAITER,
            0.7,
            0,
            tripsAt + 300,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
