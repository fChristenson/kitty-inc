// the "Zorb" event (mix; cash): it covers its crit, whose click freezes the
// screen while hundreds of coins burst out of the clicked floor's button and
// pack into a huge ball of cash round a wisp, which goes bounding round the
// screen like a zorb, rolling as it flies, slamming off the walls, the floor
// and the ceiling, every bounce a splash of coins, a bang and a jolt, ever
// faster; then it rockets up into the total and bursts there in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  clampTargetsY,
  ringTargets,
  sprayTargets,
} from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "zorb";
const REWARD = 4;
const COINS = 480;
const COIN = 0.5;
const RADIUS = 150;
const DT = 2;
const GRAVITY = 0.0055;
const LAUNCH: Point = { x: 1.1, y: -2.1 };
const BOOST = 1.08;
const MAX_VX = 2.4;
const BOUNCE_VY = 1.5;
const SPLASH = 10;
const BURST_MS = 260;
const BURST_REACH: [number, number] = [120, 340];
const WISP = 0.8;
const BOUNCE_SHAKE: [number, number] = [0.6, 1.5];

export const forceZorbEvent = registerWispEvent(
  KEY,
  "Zorb",
  () => CONFIG.zorbEvent.chance,
  (floor, context, area) => {
    const { gatherMs, bounceMs, flightMs, holdMs, mergeMs } = CONFIG.zorbEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const box = {
      left: area.left + RADIUS + 20,
      right: area.right - RADIUS - 20,
      top: area.top + 240 + RADIUS,
      bottom: area.bottom - 30 - RADIUS,
    };
    // the bounding ball, simulated once: its middle and roll every DT ms
    const steps = Math.ceil(bounceMs / DT);
    const xs = new Float32Array(steps + 1);
    const ys = new Float32Array(steps + 1);
    const rolls = new Float32Array(steps + 1);
    const bounces: { at: Point; ms: number; aim: number }[] = [];
    let x = Math.min(box.right, Math.max(box.left, button.x));
    let y = Math.min(box.bottom, Math.max(box.top, button.y));
    const side = x > (area.left + area.right) / 2 ? -1 : 1;
    let vx = LAUNCH.x * side;
    let vy = LAUNCH.y;
    let roll = 0;
    for (let i = 0; i <= steps; i++) {
      xs[i] = x;
      ys[i] = y;
      rolls[i] = roll;
      vy += GRAVITY * DT;
      x += vx * DT;
      y += vy * DT;
      roll += (vx * DT) / RADIUS;
      const ms = gatherMs + i * DT;
      const hit = (at: Point, aim: number) => bounces.push({ at, ms, aim });
      if (x < box.left || x > box.right) {
        x = x < box.left ? box.left : box.right;
        hit({ x: x + Math.sign(vx) * RADIUS, y }, vx > 0 ? Math.PI : 0);
        vx = -Math.sign(vx) * Math.min(MAX_VX, Math.abs(vx) * BOOST);
      }
      if (y > box.bottom) {
        y = box.bottom;
        hit({ x, y: y + RADIUS }, -Math.PI / 2);
        vy = -Math.max(Math.abs(vy) * 0.95, BOUNCE_VY);
        vx = Math.sign(vx) * Math.min(MAX_VX, Math.abs(vx) * BOOST);
      } else if (y < box.top) {
        y = box.top;
        hit({ x, y: y - RADIUS }, Math.PI / 2);
        vy = Math.abs(vy);
      }
    }
    const rolledAt = gatherMs + bounceMs;
    const endAt = rolledAt + flightMs;
    const travel = endAt + BURST_MS;
    const ball: Point = { x: 0, y: 0 };
    // the ball's middle and roll at ms, into ball
    const ballAt = (ms: number): number => {
      if (ms <= gatherMs) {
        ball.x = xs[0];
        ball.y = ys[0];
        return 0;
      }
      if (ms <= rolledAt) {
        const i = Math.min(steps, Math.floor((ms - gatherMs) / DT));
        ball.x = xs[i];
        ball.y = ys[i];
        return rolls[i];
      }
      const total = cover?.total() ?? fallback;
      const u = easeIn(clamp01((ms - rolledAt) / flightMs));
      ball.x = lerp([xs[steps], total.x], u);
      ball.y = lerp([ys[steps], total.y], u);
      return rolls[steps] + u * 6;
    };
    const burstTargets = ringTargets(fallback, COINS, BURST_REACH);

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      // a point on the ball's skin, seen from the side
      const z = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      const scale = COIN * (0.75 + 0.3 * z);
      return (f: number) => {
        const ms = f * travel;
        const turn = ballAt(Math.min(ms, endAt));
        const c = Math.cos(turn);
        const s = Math.sin(turn);
        const onX = ball.x + RADIUS * (px * c - py * s);
        const onY = ball.y + RADIUS * (px * s + py * c);
        if (ms < gatherMs) {
          const u = easeOut(clamp01(ms / gatherMs));
          return {
            x: lerp([button.x, onX], u),
            y: lerp([button.y, onY], u),
            scale: scale * u,
          };
        }
        if (ms < endAt) return { x: onX, y: onY, scale };
        const total = cover?.total() ?? fallback;
        const u = easeOut(clamp01((ms - endAt) / BURST_MS));
        const to = burstTargets[i];
        return {
          x: lerp([onX, to.x - fallback.x + total.x], u),
          y: lerp([onY, to.y - fallback.y + total.y], u),
          scale,
        };
      };
    });
    const wisp = (ms: number): Point => {
      ballAt(Math.max(0, Math.min(ms, endAt)));
      return ball;
    };

    const bouncing = createBeats(
      bounces,
      (b) => b.ms,
      (b, k) => {
        cover!.burst(b.at, 0.5);
        cover!.launchFrom(
          b.at,
          clampTargetsY(
            sprayTargets(b.at, SPLASH, [50, 170], b.aim, 1.8),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOUNCE_SHAKE, k / Math.max(1, bounces.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, wisp, ms, now, WISP_SIZE * WISP, 0.8, 0, endAt),
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
