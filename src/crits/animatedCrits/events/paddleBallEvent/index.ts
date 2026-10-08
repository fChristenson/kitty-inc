// the "Paddle Ball" event (bounce; a free floor): it covers its crit, whose
// click freezes the screen while a paddle wisp rises off the clicked floor's
// button with a ball wisp tied to it on a glittering elastic; it smacks the
// ball up at the locked floor, the elastic stretching out, and the ball
// bangs into the lock with a splash, a crack and a jolt and snaps back to
// be smacked again, harder and faster each time; the last smack slams the
// lock open in a huge blast and shake, the floor unlocked for free. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawBounceSplash, type Bounce } from "../../../../shared/bounce";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "paddleBall";
const HITS = 5;
const PADDLE = 0.75;
const BALL = 0.5;
const RISE = 90;
const RISE_MS = 220;
// share of each round trip spent flying out to the lock
const OUT = 0.45;
const SPLASH = 110;
const SMACK_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.6, 1.2];

export const forcePaddleBallEvent = registerWispEvent(
  KEY,
  "Paddle Ball",
  () => CONFIG.paddleBallEvent.chance,
  (floor, context) => {
    const { tripsMs, holdMs, mergeMs } = CONFIG.paddleBallEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    const paddle: Point = { x: button.x, y: button.y - RISE };
    // each round trip: smacked out, banging into the lock, snapping back
    const smacks: number[] = [];
    const hits: Bounce[] = [];
    let clock: number = RISE_MS;
    for (let k = 0; k < HITS; k++) {
      const trip = lerp(tripsMs, k / Math.max(1, HITS - 1));
      smacks.push(clock);
      hits.push({
        at: lock,
        ms: clock + trip * OUT,
        normal: Math.atan2(paddle.y - lock.y, paddle.x - lock.x),
      });
      clock += trip;
    }
    const last = hits[hits.length - 1];
    const endAt = last.ms + 400;

    const spot: Point = { x: 0, y: 0 };
    const paddleAt = (ms: number): Point | null => {
      if (ms < 0 || ms > last.ms) return null;
      spot.x = paddle.x;
      spot.y = lerp([button.y, paddle.y], easeOut(clamp01(ms / RISE_MS)));
      return spot;
    };
    const ball: Point = { x: 0, y: 0 };
    const ballAt = (ms: number): Point | null => {
      if (ms < 0 || ms > last.ms) return null;
      let k = smacks.length - 1;
      while (k > 0 && ms < smacks[k]) k--;
      if (ms < smacks[0]) {
        ball.x = paddle.x;
        ball.y =
          lerp([button.y, paddle.y], easeOut(clamp01(ms / RISE_MS))) - 30;
        return ball;
      }
      const out = hits[k].ms;
      const back = k + 1 < smacks.length ? smacks[k + 1] : out;
      // decelerating out against the elastic, then snapping back
      const u =
        ms < out
          ? easeOut((ms - smacks[k]) / (out - smacks[k]))
          : 1 - easeIn(clamp01((ms - out) / Math.max(1, back - out)));
      ball.x = lerp([paddle.x, lock.x], u);
      ball.y = lerp([paddle.y - 30, lock.y], u);
      return ball;
    };

    const smacking = createBeats(
      smacks,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SMACK_SHAKE);
      },
    );
    const hitting = createBeats(
      hits,
      (b) => b.ms,
      (b, k) => {
        if (b === last) {
          cover!.blast(lock);
          return;
        }
        cover!.burst(lock, 0.5);
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
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          smacking.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const b of hits)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          const p = paddleAt(ms);
          const b = ballAt(ms);
          if (p && b) drawBeam(ctx, p, b, 4, 0.5);
          drawWispHead(ctx, paddleAt, ms, now, WISP_SIZE * PADDLE, 0.6);
          drawWisp(ctx, ballAt, ms, now, WISP_SIZE * BALL, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
