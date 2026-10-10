// the "Zen Garden" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a rake of wisp tines
// drags down it from the top, raking a carpet of cash into long rippled
// lines like a zen garden, the lines parting and curving round every
// income bar in view like round a rock, each bar it rakes round jolting
// with a soft chime and free levels, ever faster; at the bottom the whole
// garden lifts into the total in a huge blast and shake. Pays floor income
// × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "zenGarden";
const REWARD = 3;
const MAX_BARS = 5;
const COIN = 0.42;
const MAX_COINS = 1_500;
// lines every ROW px, a coin every DOT px along them, rippling WAVE px;
// they part up to PART px round a bar
const ROW = 26;
const DOT = 9;
const WAVE = 4;
const PART = 46;
const TINES = 7;
const TINE = 0.3;
const EDGE = 14;
const SURGE_SPREAD = 300;
const LIFT = 60;
const BAR_SHAKE: [number, number] = [0.5, 1.1];

export const forceZenGardenEvent = registerWispEvent(
  KEY,
  "Zen Garden",
  () => CONFIG.zenGardenEvent.chance,
  (floor, context, area) => {
    const { rakeMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.zenGardenEvent;
    const fallback = totalSpot(area);
    const top = area.top + EDGE;
    const bottom = area.bottom - EDGE;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context)
          .filter((b) => b.center.y > top && b.center.y < bottom)
          .slice(0, MAX_BARS)
      : [];
    // the rake reaches y ever faster
    const rakeY = (ms: number) =>
      lerp([top, bottom], easeIn(clamp01(ms / rakeMs)));
    const rakedAt = (y: number) =>
      rakeMs * Math.sqrt(clamp01((y - top) / (bottom - top)));
    const endAt = rakeMs + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = [];
    const dot = Math.max(
      DOT,
      ((right - left) * (bottom - top)) / ROW / MAX_COINS,
    );
    for (let y = top; y <= bottom; y += ROW) {
      for (let x = left; x <= right; x += dot) {
        // parted round each bar like raked sand round a rock
        let dy = 0;
        for (const bar of bars) {
          const half = bar.box.width / 2;
          const across = Math.exp(-(((x - bar.center.x) / half) ** 6));
          const off = y - bar.center.y;
          const room = bar.box.height / 2 + PART;
          if (Math.abs(off) < room)
            dy += Math.sign(off || 1) * (room - Math.abs(off)) * across;
        }
        const spot: Point = { x, y: y + dy + Math.sin(x / 40 + y) * WAVE };
        const laid = rakedAt(y);
        const leaves = rakeMs + Math.random() * SURGE_SPREAD;
        const lift: Point = { x: spot.x, y: spot.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < laid) return { x: spot.x, y: spot.y, scale: 0 };
          if (ms < leaves) {
            const grow = clamp01((ms - laid) / 90);
            return { x: spot.x, y: spot.y, scale: COIN * grow };
          }
          const total = cover?.total() ?? fallback;
          bezier(
            spot,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    }
    const tines = Array.from({ length: TINES }, (_, i) => {
      const at: Point = { x: lerp([left, right], (i + 0.5) / TINES), y: 0 };
      return (ms: number): Point | null => {
        if (ms > rakeMs) return null;
        at.y = rakeY(ms);
        return at;
      };
    });

    const raking = createBeats(
      bars.map((bar) => ({ bar, at: rakedAt(bar.center.y) })),
      (r) => r.at,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor, levelShare, 2), {
          x: r.bar.center.x,
          y: r.bar.center.y - 50,
        });
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BAR_SHAKE, k / Math.max(1, bars.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          raking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const tine of tines)
            drawWispBetween(
              ctx,
              tine,
              ms,
              now,
              WISP_SIZE * TINE,
              0.5,
              0,
              rakeMs,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
