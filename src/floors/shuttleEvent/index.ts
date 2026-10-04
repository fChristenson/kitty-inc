// the "Shuttle" event (bounce; crit tiers): it covers its crit, whose click
// freezes the screen while a ball wisp drops onto the top income bar and
// starts shuttling straight up and down between it and the bar below,
// faster and faster like a ball trapped between two paddles, every bounce a
// splash and a boing; on its last bounce off each bar the bar jumps a crit
// tier with a flash and a jolt and the ball drops on to the next pair, the
// final bounce off the bottom bar landing in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawBounceSplash,
  ricochetThrough,
  type Bounce,
} from "../../shared/bounce";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "shuttle";
const MAX_BARS = 4;
const RALLIES = 1;
const DRIFT = 18;
const LOW = 60;
const BALL = 0.4;
const SPLASH = 90;
const BOING_GAP_MS = 50;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Hit {
  bar: RewardBar;
  bounce: Bounce;
}

export const forceShuttleEvent = registerWispEvent(
  KEY,
  "Shuttle",
  () => CONFIG.shuttleEvent.chance,
  (floor, context, area) => {
    const { legMs, holdMs, mergeMs } = CONFIG.shuttleEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // down onto the top bar, then up and down between each bar and the one below
    const points: Point[] = [{ x: bars[0].center.x, y: area.top - 40 }];
    const finals: { bar: RewardBar; index: number }[] = [];
    let x = bars[0].center.x;
    bars.forEach((bar, k) => {
      const below = bars[k + 1] ? bars[k + 1].box.y : area.bottom - LOW;
      for (let r = 0; r <= RALLIES; r++) {
        x += (Math.random() - 0.5) * DRIFT * 2;
        points.push({ x, y: bar.box.y + bar.box.height });
        if (r < RALLIES) points.push({ x: x + DRIFT, y: below });
      }
      finals.push({ bar, index: points.length - 2 });
    });
    points.push({ x: x + DRIFT, y: area.bottom - LOW });
    const path = ricochetThrough(points, legMs, 0);
    const hits: Hit[] = finals.map((f) => ({
      bar: f.bar,
      bounce: path.bounces[f.index],
    }));
    const last = hits[hits.length - 1];
    const endAt = last.bounce.ms;
    const bounces = path.bounces.filter((b) => b.ms <= endAt);
    let boing = -Infinity;

    const bouncing = createBeats(
      bounces,
      (b) => b.ms,
      (b) => {
        if (b.ms - boing < BOING_GAP_MS || !cover!.isLive()) return;
        boing = b.ms;
        playBloop();
      },
    );
    const hitting = createBeats(
      hits,
      (h) => h.bounce.ms,
      (h, k) => {
        cover!.tierUp(h.bar, h.bounce.at);
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bounce.at);
          return;
        }
        cover!.burst(h.bounce.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
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
          bouncing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of bounces)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          drawWispBetween(ctx, path.at, ms, now, WISP_SIZE * BALL, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
