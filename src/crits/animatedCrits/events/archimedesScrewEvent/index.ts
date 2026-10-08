// the "Archimedes Screw" event (money; free upgrade levels and cash): it
// covers its crit, whose click freezes the screen while cash pours in from
// the bottom of the screen and winds up a turning Archimedes screw in the
// middle of it, two threads of coins spiralling up round its axis, sweeping
// in front and swinging round behind; as the cash climbs past each income
// bar a jet of it gushes off the screw onto the bar with a jolt of free
// levels, and at the top it spills over into the total-income readout in a
// huge blast and shake. Pays floor income × floor number × REWARD, plus the
// levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "archimedesScrew";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 480;
const COIN = 0.45;
const THREADS = 2;
// turns of the thread from the bottom to the top, and its radius as a share
// of the screen's width
const TURNS = 3.5;
const RADIUS = 0.13;
const GROW_MS = 150;
// share of the climb a coin takes to spill over into the total
const SPILL = 0.2;
const JET_COINS = 12;
const JET_REACH: [number, number] = [90, 240];
const JET_SPAN = 0.7;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceArchimedesScrewEvent = registerWispEvent(
  KEY,
  "Archimedes Screw",
  () => CONFIG.archimedesScrewEvent.chance,
  (floor, context, area) => {
    const { streamMs, climbMs, levelShare, holdMs, mergeMs } =
      CONFIG.archimedesScrewEvent;
    const width = area.right - area.left;
    const cx = (area.left + area.right) / 2;
    const r = width * RADIUS;
    const total = totalSpot(area);
    const bottom = area.bottom + 30;
    const top = total.y + 110;
    const bars = findRewardBars(floor, context)
      .filter((b) => b.center.y > top && b.center.y < bottom)
      .slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const travel = streamMs + climbMs;
    const yAt = (p: number) => lerp([bottom, top], p);

    const paths: CoinPath[] = [];
    for (let i = 0; i < COINS; i++) {
      const enters = (i / COINS) * streamMs;
      const phase =
        ((i % THREADS) * Math.PI * 2) / THREADS + (Math.random() - 0.5) * 0.35;
      const wobble = r * (0.85 + 0.3 * Math.random());
      paths.push((f) => {
        const ms = f * travel;
        const p = (ms - enters) / climbMs;
        if (p < 0) return { x: cx, y: bottom, scale: 0 };
        const angle = phase + Math.PI * 2 * TURNS * Math.min(1, p);
        const x = cx + Math.sin(angle) * wobble;
        // swinging round in front of the axis, then round behind it
        const scale =
          COIN *
          (0.75 + 0.3 * Math.cos(angle)) *
          easeOut(clamp01((ms - enters) / GROW_MS));
        if (p <= 1) return { x, y: yAt(p), scale };
        const u = easeIn(clamp01((p - 1) / SPILL));
        return {
          x: lerp([x, total.x], u),
          y: lerp([top, total.y], u),
          scale: COIN,
        };
      });
    }

    // the head of the cash climbing past each bar
    const jets = bars
      .map((bar) => {
        const side = bar.center.x >= cx ? 1 : -1;
        const from: Point = { x: cx + side * r, y: bar.center.y };
        return {
          bar,
          from,
          aim: Math.atan2(bar.center.y - from.y - 20, bar.center.x - from.x),
          ms: ((bottom - bar.center.y) / (bottom - top)) * climbMs,
        };
      })
      .sort((a, b) => a.ms - b.ms);
    const gushing = createBeats(
      jets,
      (j) => j.ms,
      (j, k) => {
        cover!.launchFrom(
          j.from,
          clampTargetsY(
            sprayTargets(j.from, JET_COINS, JET_REACH, j.aim, JET_SPAN),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        cover!.levels(j.bar, levelsFor(j.bar.floor, levelShare, 2), j.from);
        cover!.burst(j.from, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, jets.length - 1)));
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
          gushing.tick(ms, now);
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
