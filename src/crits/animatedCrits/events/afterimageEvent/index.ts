// the "Afterimage" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while the wisp blitzes from bar to bar in
// blink-fast dashes, every stop a flash and a jolt of free levels, each
// leaving a glowing afterimage of itself hanging where it stopped; then the
// afterimages peel off one after another and streak into the clicked
// floor's income bar, each a jolt of free levels, the last in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "afterimage";
const MAX_BARS = 4;
const STOPS_PER_BAR = 2;
const SIZE = WISP_SIZE * 0.7;
const GHOST = 0.6;
const STOP_SHAKE: [number, number] = [0.3, 0.7];
const STREAK_SHAKE: [number, number] = [0.5, 1.1];

interface Stop {
  at: Point;
  bar: RewardBar;
  arrives: number;
  leaves: number;
  // its afterimage streaking into the clicked bar
  streaks: number;
  lands: number;
}

export const forceAfterimageEvent = registerWispEvent(
  KEY,
  "Afterimage",
  () => CONFIG.afterimageEvent.chance,
  (floor, context) => {
    const {
      dashMs,
      pauseMs,
      streakGapMs,
      streakMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.afterimageEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const target = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!target) return;
    const button = getButtonCenter(context.isGroundFloor);
    // zigzagging across every bar, bottom up
    const spots = [...bars].reverse().flatMap((bar, k) =>
      Array.from({ length: STOPS_PER_BAR }, (_, s) => ({
        bar,
        at: {
          x: bar.box.x + bar.box.width * ((k + s) % 2 ? 0.8 : 0.2),
          y: bar.center.y,
        },
      })),
    );
    let clock: number = 0;
    const stops: Stop[] = spots.map((s) => {
      const arrives = clock + dashMs;
      clock = arrives + pauseMs;
      return { ...s, arrives, leaves: clock, streaks: 0, lands: 0 };
    });
    const blitzEnds = clock;
    stops.forEach((s, k) => {
      s.streaks = blitzEnds + k * streakGapMs;
      s.lands = s.streaks + streakMs;
    });
    const last = stops[stops.length - 1];
    const endAt = last.lands;

    const spot: Point = { x: 0, y: 0 };
    // blinking from stop to stop
    const blitzAt = (ms: number): Point | null => {
      if (ms < 0 || ms > blitzEnds) return null;
      let from: Point = button;
      for (const s of stops) {
        if (ms < s.arrives) {
          const u = smoothstep(clamp01((ms - (s.arrives - dashMs)) / dashMs));
          spot.x = lerp([from.x, s.at.x], u);
          spot.y = lerp([from.y, s.at.y], u);
          return spot;
        }
        if (ms < s.leaves) return s.at;
        from = s.at;
      }
      return last.at;
    };
    const ghosts = stops.map((s) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < s.arrives || ms > s.lands) return null;
        if (ms < s.streaks) return s.at;
        const u = easeIn(clamp01((ms - s.streaks) / streakMs));
        p.x = lerp([s.at.x, target.center.x], u);
        p.y = lerp([s.at.y, target.center.y], u);
        return p;
      };
    });

    const stopping = createBeats(
      stops,
      (s) => s.arrives,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 1), s.at);
        cover!.burst(s.at, 0.4);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(STOP_SHAKE, k / Math.max(1, stops.length - 1)));
      },
    );
    const landing = createBeats(
      stops,
      (s) => s.lands,
      (s, k) => {
        cover!.levels(target, levelsFor(target.floor, levelShare, 1), s.at);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(target.center);
          return;
        }
        cover!.burst(target.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STREAK_SHAKE, k / Math.max(1, stops.length - 1)));
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
          stopping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (let k = 0; k < stops.length; k++) {
            const s = stops[k];
            if (ms < s.streaks)
              drawWispHead(ctx, ghosts[k], ms, now, SIZE * GHOST, 0.3);
            else
              drawWispBetween(
                ctx,
                ghosts[k],
                ms,
                now,
                SIZE * GHOST,
                0.8,
                s.streaks,
                s.lands,
              );
          }
          drawWispBetween(ctx, blitzAt, ms, now, SIZE, 0.8, 0, blitzEnds);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
