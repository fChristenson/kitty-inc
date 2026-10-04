// the "Squash" event (bounce; crit tiers): it covers its crit, whose click
// freezes the screen while a player wisp on the clicked floor's button
// smashes a ball wisp up into the top of the screen; it caroms off the top,
// banks off a side wall and comes down onto an income bar in a flash and a
// jolt that jumps it a crit tier, every wall a splash and a boing; rally
// after rally, each struck harder and quicker than the last, the last one
// slamming in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawBounceSplash,
  ricochetThrough,
  type Bounce,
  type BouncePath,
} from "../../shared/bounce";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "squash";
const MAX_BARS = 4;
const WALL = 12;
const BALL = 0.4;
const PLAYER = 0.55;
const SPLASH = 100;
const STRIKE_SPLASH = 130;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Rally {
  bar: RewardBar;
  path: BouncePath;
  struck: Bounce;
}

export const forceSquashEvent = registerWispEvent(
  KEY,
  "Squash",
  () => CONFIG.squashEvent.chance,
  (floor, context, area) => {
    const { firstMs, ralliesMs, legMs, holdMs, mergeMs } = CONFIG.squashEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const player = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    let clock = firstMs;
    const rallies: Rally[] = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      // off the front wall (the top), then one side wall, down onto the bar
      const side = k % 2 ? 1 : -1;
      const front: Point = {
        x: area.left + width * between([0.35, 0.65]),
        y: area.top + WALL,
      };
      const wall: Point = {
        x: side < 0 ? area.left + WALL : area.right - WALL,
        y: area.top + height * between([0.2, 0.35]),
      };
      const target: Point = {
        x: bar.box.x + bar.box.width * between([0.3, 0.7]),
        y: bar.center.y,
      };
      const leg = lerp(legMs, t);
      const path = ricochetThrough(
        [player, front, wall, target],
        [leg, leg * 0.8],
        clock,
      );
      clock += lerp(ralliesMs, t);
      return {
        bar,
        path,
        struck: { at: player, ms: path.startMs, normal: -Math.PI / 2 },
      };
    });
    const last = rallies.reduce((a, b) =>
      b.path.endMs > a.path.endMs ? b : a,
    );
    const endAt = last.path.endMs;
    const walls = rallies.flatMap((r) => r.path.bounces.slice(0, -1));
    const strikes = rallies.map((r) => r.struck);
    const playerAt = () => player;

    const bouncing = createBeats(
      [...strikes, ...walls],
      (b) => b.ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      rallies.slice().sort((a, b) => a.path.endMs - b.path.endMs),
      (r) => r.path.endMs,
      (r, k) => {
        const at = r.path.bounces[r.path.bounces.length - 1].at;
        cover!.tierUp(r.bar, at);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, rallies.length - 1)));
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
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of strikes)
            drawBounceSplash(ctx, b, ms - b.ms, STRIKE_SPLASH, now);
          for (const b of walls)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          if (ms < endAt)
            drawWisp(ctx, playerAt, ms, now, WISP_SIZE * PLAYER, 0.7);
          for (const r of rallies)
            drawWispBetween(
              ctx,
              r.path.at,
              ms,
              now,
              WISP_SIZE * BALL,
              1,
              r.path.startMs,
              r.path.endMs,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
