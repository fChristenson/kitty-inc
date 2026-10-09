// the "Threading" event (money; cash): it covers its crit, whose click
// freezes the screen while a river of coins coils round each bar like a
// spiral binding, looping over its front and round behind it, left to right
// along the top bar, right to left along the next and on down the building,
// every pass over a bar's front a jolt of free levels; then it
// shoots up into the total-income readout in a huge blast. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "threading";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 480;
const COIN = 0.5;
const BEHIND = 0.7;
// loops round each bar, the coil's radius as a share of the bar's height,
// and how far past its ends it runs
const LOOPS = 4;
const RADIUS = 1.2;
const OVERHANG = 40;
const STRAY = 18;
const GROW_MS = 150;
// shares of the path: between two bars, and the last leg into the total
const GAP = 0.03;
const OUT = 0.12;
const BULGE = 160;
const STEP_MS = 4;
const ARRIVE_SCALE = 0.7;
const CRASH_SHAKE: [number, number] = [0.5, 1];
const ARRIVE_SHAKE = 1;

interface Spot {
  x: number;
  y: number;
  front: boolean;
}

interface Crash {
  bar: RewardBar;
  at: Point;
  ms: number;
}

export const forceThreadingEvent = registerWispEvent(
  KEY,
  "Threading",
  () => CONFIG.threadingEvent.chance,
  (floor, context, area) => {
    const { streamMs, pathMs, levelShare, holdMs, mergeMs } =
      CONFIG.threadingEvent;
    const total = totalSpot(area);
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    // up to four bars top to bottom, ending on the clicked one when it can
    const sorted = bars
      .filter((b) => b.center.y > total.y + 110)
      .sort((a, b) => a.box.y - b.box.y);
    if (sorted.length === 0) return;
    const last = Math.max(
      sorted.indexOf(clicked),
      Math.min(MAX_BARS, sorted.length) - 1,
    );
    const route = sorted.slice(Math.max(0, last - MAX_BARS + 1), last + 1);
    const coil = (1 - OUT - GAP * (route.length - 1)) / route.length;

    const coilAt = (k: number, u: number, into: Spot): Spot => {
      const { box, center } = route[k];
      const left = box.x - OVERHANG;
      const right = box.x + box.width + OVERHANG;
      const rightward = k % 2 === 0;
      const phi = Math.PI * 2 * LOOPS * u;
      into.x = rightward ? lerp([left, right], u) : lerp([right, left], u);
      into.y = center.y - box.height * RADIUS * Math.cos(phi);
      into.front = Math.sin(phi) > 0;
      return into;
    };
    const a: Spot = { x: 0, y: 0, front: true };
    const b: Spot = { x: 0, y: 0, front: true };
    const curve = (from: Spot, via: Point, to: Spot, u: number, into: Spot) => {
      const p = (1 - u) * (1 - u);
      const q = 2 * (1 - u) * u;
      into.x = p * from.x + q * via.x + u * u * to.x;
      into.y = p * from.y + q * via.y + u * u * to.y;
      into.front = true;
      return into;
    };
    // the path from s 0 to 1: a coil per bar, a swing down between, then up
    // into the total
    const at = (s: number, into: Spot): Spot => {
      for (let k = 0; k < route.length; k++) {
        const start = k * (coil + GAP);
        if (s <= start + coil)
          return coilAt(k, clamp01((s - start) / coil), into);
        if (k < route.length - 1 && s <= start + coil + GAP) {
          coilAt(k, 1, a);
          coilAt(k + 1, 0, b);
          const side = k % 2 ? -1 : 1;
          return curve(
            a,
            { x: a.x + side * BULGE, y: (a.y + b.y) / 2 },
            b,
            (s - start - coil) / GAP,
            into,
          );
        }
      }
      coilAt(route.length - 1, 1, a);
      const u = easeIn(clamp01((s - (1 - OUT)) / OUT));
      return curve(a, { x: area.left, y: total.y }, total as Spot, u, into);
    };
    const hidden = (p: Spot) =>
      !p.front &&
      route.some(
        ({ box }) =>
          p.x > box.x &&
          p.x < box.x + box.width &&
          p.y > box.y &&
          p.y < box.y + box.height,
      );

    const travel = streamMs + pathMs;
    const paths: CoinPath[] = [];
    for (let i = 0; i < COINS; i++) {
      const enters = (i / COINS) * streamMs;
      const stray = (Math.random() - 0.5) * 2 * STRAY;
      const spot: Spot = { x: 0, y: 0, front: true };
      paths.push((f) => {
        const ms = f * travel;
        const s = (ms - enters) / pathMs;
        if (s < 0) {
          at(0, spot);
          return { x: spot.x, y: spot.y, scale: 0 };
        }
        at(Math.min(1, s), spot);
        const grow = easeOut(clamp01((ms - enters) / GROW_MS));
        const scale = hidden(spot)
          ? 0
          : COIN * (spot.front ? 1 : BEHIND) * grow;
        return { x: spot.x, y: spot.y + stray, scale };
      });
    }

    // where the head passes down over each bar's front
    const crashes: Crash[] = [];
    const p: Spot = { x: 0, y: 0, front: true };
    const q: Spot = { x: 0, y: 0, front: true };
    for (let t = 0; t < pathMs * (1 - OUT); t += STEP_MS) {
      at(t / pathMs, p);
      at((t + STEP_MS) / pathMs, q);
      if (!q.front) continue;
      for (const bar of route) {
        const { box, center } = bar;
        if ((p.y - center.y) * (q.y - center.y) > 0) continue;
        if (q.x < box.x || q.x > box.x + box.width) continue;
        crashes.push({ bar, at: { x: q.x, y: center.y }, ms: t });
      }
    }

    const crashing = createBeats(
      crashes,
      (c) => c.ms,
      (c, k) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 1), c.at);
        if (cover!.isLive())
          shakeScreen(lerp(CRASH_SHAKE, k / Math.max(1, crashes.length - 1)));
      },
    );
    const arriving = createBeats(
      [pathMs],
      (ms) => ms,
      () => {
        cover!.burst(cover!.total() ?? total, ARRIVE_SCALE);
        if (cover!.isLive()) shakeScreen(ARRIVE_SHAKE);
      },
    );
    const spilling = createBeats(
      [travel],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(cover!.total() ?? total);
      },
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
          crashing.tick(ms, now);
          arriving.tick(ms, now);
          spilling.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
