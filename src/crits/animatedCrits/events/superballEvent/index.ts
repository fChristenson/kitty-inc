// the "Superball" event (wisp; cash): it covers its crit, whose click
// freezes the screen while the clicked floor's button fires a superball
// wisp that bounces round the screen like crazy, gaining speed with every
// bounce instead of losing it, off the floor, the walls and the ceiling,
// each bounce a pop, a boing, a jolt and a burst of coins, until it's a
// blur and bursts in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "superball";
const REWARD = 4;
const EDGE = 40;
const TOP = 150;
// px/ms², each bounce speeding it up by BOOST
const GRAVITY = 0.004;
const BOOST = 1.06;
const LAUNCH = 1.3;
const STEP_MS = 4;
const FRAME_MS = 16;
const MAX_SPEED = 3;
const BALL = 0.5;
const COINS = 8;
const COIN_REACH: [number, number] = [25, 100];
const BOUNCE_SHAKE: [number, number] = [0.3, 1.2];

export const forceSuperballEvent = registerWispEvent(
  KEY,
  "Superball",
  () => CONFIG.superballEvent.chance,
  (floor, context, area) => {
    const { bounceMs, holdMs, mergeMs } = CONFIG.superballEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    // bounced once at arm: its spot every FRAME_MS and every bounce
    let x = Math.min(right, Math.max(left, button.x));
    let y = Math.min(bottom, Math.max(top, button.y));
    let vx = (Math.random() < 0.5 ? -1 : 1) * LAUNCH * 0.6;
    let vy = -LAUNCH;
    const track: number[] = [];
    const bounces: { at: Point; ms: number }[] = [];
    for (let ms = 0; ms <= bounceMs; ms += STEP_MS) {
      vy += GRAVITY * STEP_MS;
      x += vx * STEP_MS;
      y += vy * STEP_MS;
      let bounced = false;
      if (x < left || x > right) {
        vx = -vx * BOOST;
        x = Math.min(right, Math.max(left, x));
        bounced = true;
      }
      if (y < top || y > bottom) {
        vy = -vy * BOOST;
        y = Math.min(bottom, Math.max(top, y));
        bounced = true;
      }
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_SPEED) {
        vx *= MAX_SPEED / speed;
        vy *= MAX_SPEED / speed;
      }
      if (bounced) bounces.push({ at: { x, y }, ms });
      if (ms % FRAME_MS === 0) track.push(x, y);
    }
    const frames = track.length / 2;
    const endAt = bounceMs;
    const end: Point = {
      x: track[track.length - 2],
      y: track[track.length - 1],
    };
    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point => {
      const f = Math.max(0, ms) / FRAME_MS;
      const i = Math.min(frames - 2, Math.floor(f));
      ballAt.x = lerp([track[i * 2], track[i * 2 + 2]], f - i);
      ballAt.y = lerp([track[i * 2 + 1], track[i * 2 + 3]], f - i);
      return ballAt;
    };

    const bouncing = createBeats(
      bounces,
      (b) => b.ms,
      (b, k) => {
        cover!.launchFrom(b.at, ringTargets(b.at, COINS, COIN_REACH));
        cover!.burst(b.at, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BOUNCE_SHAKE, k / Math.max(1, bounces.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(end),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              ball,
              ms,
              now,
              WISP_SIZE * BALL,
              0.5 + 0.5 * (ms / endAt),
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
