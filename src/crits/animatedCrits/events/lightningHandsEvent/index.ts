// the "Lightning Hands" event (lightning; crit tiers): it covers its crit,
// whose click freezes the screen while a sorcerer wisp rises into the
// middle of the screen, crackling; it throws a roaring stream of forked
// lightning from its hands onto one income bar after another, pouring it on
// until the bar jumps a crit tier in a blinding flash and a jolt, each
// stream fiercer and shorter than the last; then it unleashes on every bar
// at once in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "lightningHands";
const MAX_BARS = 4;
const HIGH = 0.45;
const HANDS = 34;
const STREAM = 3;
const RISE_MS = 260;
const FINALE_MS = 300;
const SORCERER = 0.7;
const HIT_SHAKE: [number, number] = [0.6, 1.3];
const FINAL_SHAKE = 2.2;

interface Stream {
  bar: RewardBar;
  starts: number;
  ends: number;
  bolts: Bolt[];
  hits: Point[];
}

export const forceLightningHandsEvent = registerWispEvent(
  KEY,
  "Lightning Hands",
  () => CONFIG.lightningHandsEvent.chance,
  (floor, context, area) => {
    const { streamsMs, holdMs, mergeMs } = CONFIG.lightningHandsEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const sorcerer: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HIGH,
    };
    const hands: Point[] = [
      { x: sorcerer.x - HANDS, y: sorcerer.y },
      { x: sorcerer.x + HANDS, y: sorcerer.y },
    ];
    let clock = RISE_MS;
    const streamOf = (bar: RewardBar, starts: number, ends: number): Stream => {
      const hits = Array.from({ length: STREAM }, (_, i) => ({
        x: bar.box.x + (bar.box.width * (i + 0.5)) / STREAM,
        y: bar.center.y,
      }));
      return {
        bar,
        starts,
        ends,
        hits,
        bolts: hits.map((h, i) => createBolt(hands[i % 2], h, 2)),
      };
    };
    const streams: Stream[] = bars.map((bar, k) => {
      const starts = clock;
      clock += lerp(streamsMs, k / Math.max(1, bars.length - 1));
      return streamOf(bar, starts, clock);
    });
    const finaleAt = clock;
    const endAt = finaleAt + FINALE_MS;
    const finale = bars.map((bar) => streamOf(bar, finaleAt, endAt));
    const all = [...streams, ...finale];
    const spot: Point = { x: sorcerer.x, y: sorcerer.y };
    const sorcererAt = (ms: number): Point => {
      spot.y =
        sorcerer.y +
        (1 - easeOutBack(clamp01(ms / RISE_MS))) * 260 +
        Math.sin(ms * 0.01) * 6;
      return spot;
    };

    const striking = createBeats(
      streams,
      (s) => s.ends,
      (s, k) => {
        cover!.tierUp(s.bar, s.bar.center);
        cover!.burst(s.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, streams.length - 1)));
      },
    );
    const unleashing = createBeats(
      [finaleAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(sorcerer);
        if (cover!.isLive()) shakeScreen(FINAL_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          striking.tick(ms, now);
          unleashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const s of all) {
            if (ms < s.starts || ms >= s.ends) continue;
            // fiercer the longer it pours on
            const u = (ms - s.starts) / (s.ends - s.starts);
            const scale = s.ends === endAt ? 1.4 : 0.6 + 0.6 * u;
            for (const bolt of s.bolts)
              drawBolt(ctx, bolt, 0.6 + 0.4 * Math.random(), scale);
            for (const h of s.hits) drawStrike(ctx, h, 0.7 + 0.3 * u, 0.7, now);
          }
          drawWisp(
            ctx,
            sorcererAt,
            ms,
            now,
            WISP_SIZE * SORCERER,
            lerp([0.5, 1], clamp01(ms / finaleAt)),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
