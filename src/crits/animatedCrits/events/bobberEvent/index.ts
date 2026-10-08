// the "Bobber" event (mix): it covers its crit, whose click freezes the
// screen while a jet of cash shoots straight up out of the clicked floor's
// button like a fountain, a wisp balanced bobbing on its crest and the cash
// spilling back down round it into a pool; the jet surges higher and higher
// in jolts, the wisp riding each surge with a flash, until one last surge
// fires the wisp up into the total-income readout in a huge blast and shake,
// and the pool erupts up after it into the total. Pays floor income × floor
// number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "bobber";
const REWARD = 4;
// the jet reaches these shares of the way up from the button to the total,
// surging from one to the next; GRAVITY px/ms² pulls the cash back down,
// fanning FAN px/ms sideways into a pool round the button
const LEVELS = [0.22, 0.42, 0.62];
const GRAVITY = 0.004;
const FAN = 0.12;
const POOL = 14;
const COINS = 1_100;
const COIN = 0.8;
const BOB = 6;
const BALL = 0.065;
const SURGE_MS = 160;
const SURGE_BURST: [number, number] = [0.6, 1];
const SURGE_SHAKE: [number, number] = [1.1, 1.9];

export const forceBobberEvent = registerWispEvent(
  KEY,
  "Bobber",
  () => CONFIG.bobberEvent.chance,
  (floor, context, area) => {
    const { levelMs, launchMs, sweepMs, flightMs, holdMs, mergeMs } =
      CONFIG.bobberEvent;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const climb = button.y - fallback.y;
    const surges = LEVELS.map((_, k) => k * levelMs);
    const fireAt = LEVELS.length * levelMs;
    const inAt = fireAt + launchMs;
    const travelMs = inAt + sweepMs + flightMs;
    // how high the jet reaches ms in, surging up each level
    const reach = (ms: number) => {
      let h = 0;
      surges.forEach((at, k) => {
        if (ms >= at)
          h = lerp(
            [k === 0 ? 0 : LEVELS[k - 1], LEVELS[k]],
            easeOutBack(clamp01((ms - at) / SURGE_MS)),
          );
      });
      return climb * h;
    };
    const ball = { x: 0, y: 0 };
    const ballAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= inAt) return null;
      if (ms < fireAt) {
        ball.x = button.x + Math.sin(ms / 70) * 2;
        ball.y = button.y - reach(ms) + Math.sin(ms / 55) * BOB;
        return ball;
      }
      const total = cover?.total() ?? fallback;
      const u = easeIn(clamp01((ms - fireAt) / launchMs));
      const from = button.y - reach(fireAt);
      ball.x = button.x + (total.x - button.x) * u;
      ball.y = from + (total.y - from) * u;
      return ball;
    };

    // each coin shot up to the jet's height as it leaves, falling back round it
    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const launch = Math.random() * fireAt;
      const v = Math.sqrt(2 * GRAVITY * Math.max(10, reach(launch)));
      const vx = (Math.random() - 0.5) * FAN * 2;
      const air = (2 * v) / GRAVITY;
      const land = {
        x: button.x + vx * air,
        y: button.y + (Math.random() - 0.5) * POOL,
      };
      const leave = inAt + Math.random() * sweepMs;
      return (f) => {
        const ms = f * travelMs;
        if (ms < launch) return { x: button.x, y: button.y, scale: 0 };
        const t = ms - launch;
        if (t < air && ms < leave)
          return {
            x: button.x + vx * t,
            y: button.y - v * t + 0.5 * GRAVITY * t * t,
            scale: COIN,
          };
        const tl = Math.min(air, leave - launch);
        const from =
          tl < air
            ? {
                x: button.x + vx * tl,
                y: button.y - v * tl + 0.5 * GRAVITY * tl * tl,
              }
            : land;
        if (ms < leave) return { x: from.x, y: from.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        const p = bezier(
          from,
          { x: from.x, y: total.y },
          total,
          easeIn(clamp01((ms - leave) / flightMs)),
          { x: 0, y: 0 },
        );
        return { x: p.x, y: p.y, scale: COIN };
      };
    });

    const surging = createBeats(
      surges.slice(1),
      (ms) => ms,
      (ms, k) => {
        const t = k / Math.max(1, surges.length - 2);
        cover!.burst(
          { x: button.x, y: button.y - reach(ms + SURGE_MS) },
          lerp(SURGE_BURST, t),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SURGE_SHAKE, t));
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          surging.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            ballAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * BALL),
            clamp01(ms / fireAt),
            0,
            inAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
