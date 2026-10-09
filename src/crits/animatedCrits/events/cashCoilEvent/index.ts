// the "Cash Coil" event (money; cash): it covers its crit, whose click
// freezes the screen while a river of coins pours in from the bottom and
// spirals up round the outside of the building like a coil, vanishing
// behind it at the screen's sides and sweeping back across the front; every
// bar the head of the river crashes through on the way up blows with a
// jolt of free levels, and at the roof it arcs off into the total-income
// readout in a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "cashCoil";
const REWARD = 2;
const COINS = 520;
const COIN = 0.5;
// laps round the building from the bottom to the top, its radius just
// inside the screen's half width, and how far each coin strays off the line
const WRAPS = 3;
const INSET = 10;
const STRAY = 35;
const GROW_MS = 150;
// share of the climb a coin takes to arc over into the total
const SPILL = 0.2;
const STEP_MS = 8;
const CRASH_BLAST = 170;
const ARRIVE_SCALE = 0.7;
const CRASH_SHAKE: [number, number] = [0.6, 1.2];
const ARRIVE_SHAKE = 1;
const SOUND_GAP_MS = 55;

interface Crash {
  bar: RewardBar;
  at: Point;
  ms: number;
}

export const forceCashCoilEvent = registerWispEvent(
  KEY,
  "Cash Coil",
  () => CONFIG.cashCoilEvent.chance,
  (floor, context, area) => {
    const { streamMs, climbMs, levelShare, holdMs, mergeMs } =
      CONFIG.cashCoilEvent;
    const width = area.right - area.left;
    const cx = (area.left + area.right) / 2;
    const radius = width / 2 - INSET;
    const total = totalSpot(area);
    const bottom = area.bottom + 30;
    const top = total.y + 110;
    const bars = findRewardBars(floor, context).filter(
      (b) => b.center.y > top && b.center.y < bottom,
    );
    if (bars.length === 0) return;
    const travel = streamMs + climbMs * (1 + SPILL);
    const yAt = (p: number) => lerp([bottom, top], p);
    const angleAt = (p: number) => Math.PI * 2 * WRAPS * p;

    const paths: CoinPath[] = [];
    for (let i = 0; i < COINS; i++) {
      const enters = (i / COINS) * streamMs;
      const stray = (Math.random() - 0.5) * 2 * STRAY;
      const reach = radius * (0.94 + 0.06 * Math.random());
      paths.push((f) => {
        const ms = f * travel;
        const p = (ms - enters) / climbMs;
        if (p < 0) return { x: cx, y: bottom, scale: 0 };
        const angle = angleAt(Math.min(1, p));
        const x = cx + Math.sin(angle) * reach;
        if (p <= 1) {
          // behind the building it's hidden; in front it swells as it faces out
          const facing = Math.cos(angle);
          const scale =
            facing > 0
              ? COIN *
                (0.8 + 0.25 * facing) *
                easeOut(clamp01((ms - enters) / GROW_MS))
              : 0;
          return { x, y: yAt(p) + stray, scale };
        }
        const u = easeIn(clamp01((p - 1) / SPILL));
        return {
          x: lerp([x, total.x], u),
          y: lerp([top + stray, total.y], u),
          scale: COIN,
        };
      });
    }

    // where the head sweeps across each bar in front
    const crashes: Crash[] = [];
    let prev = yAt(0);
    for (let t = STEP_MS; t <= climbMs; t += STEP_MS) {
      const p = t / climbMs;
      const y = yAt(p);
      const angle = angleAt(p);
      const x = cx + Math.sin(angle) * radius;
      if (Math.cos(angle) > 0)
        for (const bar of bars) {
          const { box, center } = bar;
          if ((prev - center.y) * (y - center.y) > 0) continue;
          if (x < box.x || x > box.x + box.width) continue;
          crashes.push({ bar, at: { x, y: center.y }, ms: t });
        }
      prev = y;
    }
    const arrives = climbMs * (1 + SPILL);
    const lastCrash = crashes.length ? crashes[crashes.length - 1].ms : 0;
    const endMs = Math.max(lastCrash, arrives) + DETONATION_MS;

    let soundAt = -Infinity;
    const crashing = createBeats(
      crashes,
      (c) => c.ms,
      (c, k, now) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 1), c.at);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(CRASH_SHAKE, k / Math.max(1, crashes.length - 1)));
        if (now - soundAt < SOUND_GAP_MS) return;
        soundAt = now;
        playExplosion();
      },
    );
    const arriving = createBeats(
      [arrives],
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
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          for (const c of crashes)
            drawDetonation(ctx, c.at, ms - c.ms, CRASH_BLAST, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
