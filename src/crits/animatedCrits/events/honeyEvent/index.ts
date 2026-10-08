// the "Honey" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a thick thread of cash drizzles
// down out of the sky like honey off a spoon and coils round and round on
// itself where it lands, heaping up into a swirl on top of an income bar;
// as each heap tops out the bar jolts with a bloop, a splash and free levels
// and the thread swings on to the next, quicker each time; then every heap
// slurps up into the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "honey";
const REWARD = 2;
const MAX_BARS = 3;
const COINS = 1_400;
const COIN = 0.55;
// each heap coils COIL px round and COIL_SQUASH as deep, TURNS times round
// a second, and stacks HEAP px high
const COIL = 46;
const COIL_SQUASH = 0.32;
const TURNS = 6;
const HEAP = 90;
// the thread falls from SKY px over the screen, taking FALL_MS
const SKY = 40;
const FALL_MS = 200;
// the top of a heap slurps up first, the bottom up to SLURP_SPREAD ms later
const SLURP_SPREAD = 260;
const LIFT = 60;
const HEAP_SHAKE: [number, number] = [0.8, 1.6];

export const forceHoneyEvent = registerWispEvent(
  KEY,
  "Honey",
  () => CONFIG.honeyEvent.chance,
  (floor, context, area) => {
    const {
      poursMs,
      swingMs,
      settleMs,
      flightMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.honeyEvent;
    const fallback = totalSpot(area);
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const heaps = bars.map((bar, k) => ({
      bar,
      base: {
        x: bar.box.x + bar.box.width * (k % 2 === 0 ? 0.32 : 0.68),
        y: bar.box.y - 4,
      },
      from: 0,
      to: 0,
    }));
    let clock = 0;
    heaps.forEach((heap, k) => {
      heap.from = clock;
      heap.to = clock + lerp(poursMs, k / Math.max(1, heaps.length - 1));
      clock = heap.to + swingMs;
    });
    const pourMs = heaps[heaps.length - 1].to;
    const slurpAt = pourMs + FALL_MS + settleMs;
    const endAt = slurpAt + SLURP_SPREAD + flightMs;
    const sky = area.top - SKY;
    // where the thread lands at ms: coiling on a heap, or swinging between two
    const landing = (
      ms: number,
      into: Point,
    ): { rise: number; hidden: boolean } => {
      let k = 0;
      while (k < heaps.length - 1 && ms > heaps[k].to) k++;
      const heap = heaps[k];
      if (ms < heap.from) {
        const prev = heaps[k - 1];
        const u = (ms - prev.to) / swingMs;
        into.x = lerp([prev.base.x, heap.base.x], u);
        into.y = lerp([prev.base.y, heap.base.y], u);
        return { rise: 0, hidden: true };
      }
      const u = (ms - heap.from) / (heap.to - heap.from);
      const angle = (ms / 1000) * TURNS * Math.PI * 2;
      into.x = heap.base.x + Math.cos(angle) * COIL;
      into.y =
        heap.base.y - u * HEAP + Math.sin(angle) * COIL * COIL_SQUASH - 8;
      return { rise: u, hidden: false };
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const leaves = Math.random() * pourMs;
      const rest: Point = { x: 0, y: 0 };
      const { rise, hidden } = landing(leaves, rest);
      const spout = heaps.find((h) => leaves <= h.to) ?? heaps[0];
      const spoutX = hidden ? rest.x : spout.base.x;
      const lands = leaves + FALL_MS;
      const lifts = slurpAt + (1 - rise) * SLURP_SPREAD;
      const lift: Point = { x: rest.x, y: rest.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: spoutX, y: sky, scale: 0 };
        if (ms < lands) {
          const u = (ms - leaves) / FALL_MS;
          const fall = easeIn(u);
          return {
            x: lerp([spoutX, rest.x], fall * fall),
            y: lerp([sky, rest.y], fall),
            scale: COIN,
          };
        }
        if (hidden) return { x: rest.x, y: rest.y, scale: 0 };
        if (ms < lifts) return { x: rest.x, y: rest.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        bezier(rest, lift, total, easeIn(clamp01((ms - lifts) / flightMs)), at);
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const heaping = createBeats(
      heaps,
      (h) => h.to + FALL_MS,
      (h, k) => {
        const t = k / Math.max(1, heaps.length - 1);
        cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare, 2), {
          x: h.base.x,
          y: sky,
        });
        cover!.burst({ x: h.base.x, y: h.base.y - HEAP / 2 }, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HEAP_SHAKE, t));
      },
    );
    const slurping = createBeats(
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
          heaping.tick(ms, now);
          slurping.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
