// the "Upstrike" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while an income bar crackles and a bolt of
// lightning tears straight up out of it like upward lightning, forking as
// it climbs to the top of the screen, and cracks with a blinding flash, a
// bang and a jolt as the bar jumps a crit tier; the next bar fires its own,
// quicker each time, and the last tears up in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "upstrike";
const MAX_BARS = 5;
const TOP = 40;
// side branches split off this far up the climb, reaching out this far
const BRANCHES = [0.35, 0.6];
const BRANCH = 160;
const FADE_MS = 300;
const STRIKE_SHAKE: [number, number] = [0.6, 1.4];

interface Strike {
  bar: RewardBar;
  from: Point;
  head: Point;
  top: number;
  starts: number;
  cracks: number;
  trunk: Bolt;
  branches: { bolt: Bolt; at: number; reach: number; side: number }[];
}

export const forceUpstrikeEvent = registerWispEvent(
  KEY,
  "Upstrike",
  () => CONFIG.upstrikeEvent.chance,
  (floor, context, area) => {
    const { climbMs, strikesMs, holdMs, mergeMs } = CONFIG.upstrikeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const strikes: Strike[] = bars.map((bar, k) => {
      const from: Point = {
        x: bar.center.x + (Math.random() - 0.5) * bar.box.width * 0.4,
        y: bar.box.y,
      };
      const head: Point = { x: from.x, y: from.y };
      const starts = clock;
      clock += lerp(strikesMs, k / Math.max(1, bars.length - 1));
      return {
        bar,
        from,
        head,
        top: area.top + TOP,
        starts,
        cracks: starts + climbMs,
        trunk: createBolt(from, head, 0),
        branches: BRANCHES.map((at, i) => {
          const root: Point = { x: from.x, y: from.y };
          const tip: Point = { x: from.x, y: from.y };
          return {
            bolt: createBolt(root, tip, 0),
            at,
            reach: BRANCH,
            side: i % 2 === 0 ? -1 : 1,
          };
        }),
      };
    });
    const last = strikes[strikes.length - 1];
    const endAt = last.cracks;

    const cracking = createBeats(
      strikes,
      (s) => s.cracks,
      (s, k) => {
        cover!.tierUp(s.bar, s.from);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.from);
          return;
        }
        cover!.burst(s.from, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, strikes.length - 1)));
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
        tick: (ms, now) => cracking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + FADE_MS) return;
          for (const s of strikes) {
            if (ms < s.starts || ms > s.cracks + FADE_MS) continue;
            // the head tears up toward the top, the branches splitting off behind it
            const climb = easeIn(clamp01((ms - s.starts) / climbMs));
            s.head.y = lerp([s.from.y, s.top], climb);
            const fade = ms > s.cracks ? 1 - (ms - s.cracks) / FADE_MS : 0.8;
            const flash = ms >= s.cracks && ms < s.cracks + 80 ? 1.6 : 1;
            drawBolt(ctx, s.trunk, fade, 0.9 * flash);
            for (const br of s.branches) {
              if (climb < br.at) continue;
              const root = br.bolt.from;
              root.y = lerp([s.from.y, s.top], br.at);
              const grow = clamp01((climb - br.at) / (1 - br.at));
              br.bolt.to.x = root.x + br.side * br.reach * grow;
              br.bolt.to.y = root.y - br.reach * grow;
              drawBolt(ctx, br.bolt, fade, 0.5 * flash);
            }
            drawStrike(ctx, s.from, fade, 0.8, now);
            if (ms >= s.cracks) drawStrike(ctx, s.head, fade, 1.4, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
