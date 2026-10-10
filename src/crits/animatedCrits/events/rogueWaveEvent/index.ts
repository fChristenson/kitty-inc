// the "Rogue Wave" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a sea of cash floods up over the
// bottom of the screen and two swells roll in from either side, growing as
// they come; where they meet they pile into each other and rear up into a
// towering rogue wave whose peak shoots straight up the screen past every
// bar, each a jolt of free levels, and on into the total, the rest of the
// sea rushing up after it. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "rogueWave";
const REWARD = 3;
const COINS = 900;
const COIN = 0.42;
const MARGIN = 30;
// the sea's depth, the swells' width and the rogue peak, as shares
const DEPTH = 0.16;
const SWELL_W = 0.11;
const SWELL: [number, number] = [0.6, 1.4];
const PEAK = 2.6;
// coins within this many swell widths of the meeting point ride the spout
const SPOUT = 0.9;
const SPOUT_SPREAD = 150;
const RUSH_SPREAD = 450;
const RUSH_DELAY = 250;
const MEET_SHAKE = 1.8;
const PASS_SHAKE: [number, number] = [0.6, 1.1];

export const forceRogueWaveEvent = registerWispEvent(
  KEY,
  "Rogue Wave",
  () => CONFIG.rogueWaveEvent.chance,
  (floor, context, area) => {
    const { floodMs, swellMs, spoutMs, leapMs, levelShare, holdMs, mergeMs } =
      CONFIG.rogueWaveEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const bottom = area.bottom - MARGIN;
    const depth = height * DEPTH;
    const mid = (area.left + area.right) / 2;
    const swellW = width * SWELL_W;
    const total = totalSpot(area);
    const meetAt = floodMs + swellMs;
    const gauss = (d: number) => Math.exp(-(d * d) / (2 * swellW * swellW));
    // how far the sea stands above its floor at x
    const surge = (x: number, ms: number) => {
      const u = clamp01((ms - floodMs) / swellMs);
      const amp = depth * lerp(SWELL, u);
      const left = lerp([area.left - swellW * 2, mid], u);
      const right = lerp([area.right + swellW * 2, mid], u);
      const rogue = PEAK * depth * smoothstep(clamp01((u - 0.7) / 0.3));
      return (
        depth +
        amp * (gauss(x - left) + gauss(x - right)) +
        rogue * gauss((x - mid) * 2.2)
      );
    };
    const peakY = bottom - surge(mid, meetAt);
    const spoutAt = (u: number) => lerp([peakY, total.y], easeIn(u));

    const travel = meetAt + RUSH_DELAY + RUSH_SPREAD + leapMs;
    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const x = area.left + MARGIN + Math.random() * (width - MARGIN * 2);
      const v = Math.random();
      const riseAt = floodMs * 0.45 * v;
      const spout = Math.abs(x - mid) < swellW * SPOUT;
      const crest = bottom - v * surge(x, meetAt);
      // the spout's top coins leave first; the rest of the sea rushes after
      const leaves = spout
        ? meetAt + SPOUT_SPREAD * (1 - v)
        : meetAt + RUSH_DELAY + RUSH_SPREAD * Math.random();
      const from: Point = { x: 0, y: 0 };
      const bend: Point = { x: mid, y: 0 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * travel;
        if (ms < floodMs) {
          const u = easeOut(clamp01((ms - riseAt) / (floodMs * 0.55)));
          return {
            x,
            y: lerp([area.bottom + 40, bottom - v * depth], u),
            scale: COIN,
          };
        }
        if (ms < meetAt)
          return { x, y: bottom - v * surge(x, ms), scale: COIN };
        if (ms < leaves) return { x, y: crest, scale: COIN };
        if (spout) {
          const u = clamp01((ms - leaves) / spoutMs);
          return {
            x: lerp([x, mid + (x - mid) * 0.3], u),
            y: lerp([crest, total.y], easeIn(u)),
            scale: COIN,
          };
        }
        from.x = x;
        from.y = crest;
        bend.y = Math.min(crest, peakY) - 120;
        const p = bezier(
          from,
          bend,
          total,
          easeIn(clamp01((ms - leaves) / leapMs)),
          at,
        );
        return { x: p.x, y: p.y, scale: COIN };
      };
    });

    // the peak passing each bar on its way up
    const bars = findRewardBars(floor, context).filter(
      (b) => b.center.y < peakY && b.center.y > total.y,
    );
    const passes = bars
      .map((bar) => ({
        bar,
        ms:
          meetAt +
          Math.sqrt((peakY - bar.center.y) / (peakY - total.y)) * spoutMs,
      }))
      .sort((a, b) => a.ms - b.ms);
    const finaleAt = Math.max(travel, meetAt + spoutMs);

    const rolling = createBeats(
      [floodMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const meeting = createBeats(
      [meetAt],
      (ms) => ms,
      () => {
        cover!.burst({ x: mid, y: peakY }, 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(MEET_SHAKE);
      },
    );
    const passing = createBeats(
      passes,
      (p) => p.ms,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), {
          x: mid,
          y: spoutAt(0),
        });
        cover!.burst({ x: mid, y: p.bar.center.y }, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const landing = createBeats(
      [finaleAt],
      (ms) => ms,
      () => {
        for (const p of passes) cover!.slam(p.bar);
        cover!.blast(cover!.total() ?? total);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars: passes.map((p) => p.bar),
        tick: (ms, now) => {
          rolling.tick(ms, now);
          meeting.tick(ms, now);
          passing.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
