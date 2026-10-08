// the "Bumper Cars" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a ring of wisps bursts out of the clicked floor's
// button and careers round the middle of the screen like bumper cars,
// ricocheting off the walls and smashing into each other, every crash a
// pop, a bloop and a burst of coins, faster and faster; then they all spin
// in and pile up in the middle in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "bumperCars";
const REWARD = 4;
const CARS = 6;
// cars RADIUS px round, starting SPEED px/ms and speeding up by ACCEL
// times over the drive; the arena is the screen less EDGE
const RADIUS = 22;
const SPEED = 0.55;
const ACCEL = 2.2;
const EDGE = 50;
const START = 70;
const STEP_MS = 4;
const FRAME_MS = 16;
// at most one crash pays out every CRASH_GAP_MS
const CRASH_GAP_MS = 60;
const PILE_MS = 250;
const CAR = 0.5;
const COINS = 7;
const COIN_REACH: [number, number] = [25, 100];
const CRASH_SHAKE: [number, number] = [0.3, 1.1];

export const forceBumperCarsEvent = registerWispEvent(
  KEY,
  "Bumper Cars",
  () => CONFIG.bumperCarsEvent.chance,
  (floor, context, area) => {
    const { driveMs, holdMs, mergeMs } = CONFIG.bumperCarsEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + EDGE + 120;
    const bottom = area.bottom - EDGE;
    const center: Point = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const start = {
      x: Math.min(right - START, Math.max(left + START, button.x)),
      y: Math.min(bottom - START, Math.max(top + START, button.y)),
    };
    const turn = Math.random() * Math.PI * 2;
    // driven once at arm: every car's spot each FRAME_MS, and every crash
    const cars = Array.from({ length: CARS }, (_, i) => {
      const a = turn + (i / CARS) * Math.PI * 2;
      return {
        x: start.x + Math.cos(a) * START,
        y: start.y + Math.sin(a) * START,
        vx: Math.cos(a) * SPEED,
        vy: Math.sin(a) * SPEED,
        track: [] as number[],
      };
    });
    const crashes: { at: Point; ms: number }[] = [];
    let lastCrash = -Infinity;
    for (let ms = 0; ms <= driveMs; ms += STEP_MS) {
      const boost = 1 + ((ACCEL - 1) * STEP_MS) / driveMs;
      for (const c of cars) {
        c.vx *= boost;
        c.vy *= boost;
        c.x += c.vx * STEP_MS;
        c.y += c.vy * STEP_MS;
        if (c.x < left || c.x > right) {
          c.vx = -c.vx;
          c.x = Math.min(right, Math.max(left, c.x));
        }
        if (c.y < top || c.y > bottom) {
          c.vy = -c.vy;
          c.y = Math.min(bottom, Math.max(top, c.y));
        }
      }
      for (let i = 0; i < CARS; i++)
        for (let j = i + 1; j < CARS; j++) {
          const a = cars[i];
          const b = cars[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d === 0 || d >= RADIUS * 2) continue;
          const nx = dx / d;
          const ny = dy / d;
          const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (closing <= 0) continue;
          // equal masses: swap the velocity along the line between them
          a.vx -= closing * nx;
          a.vy -= closing * ny;
          b.vx += closing * nx;
          b.vy += closing * ny;
          if (ms - lastCrash >= CRASH_GAP_MS) {
            lastCrash = ms;
            crashes.push({ at: { x: a.x + dx / 2, y: a.y + dy / 2 }, ms });
          }
        }
      if (ms % FRAME_MS === 0) for (const c of cars) c.track.push(c.x, c.y);
    }
    const endAt = driveMs + PILE_MS;
    const frames = cars[0].track.length / 2;
    const wisps = cars.map((c) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        if (ms >= driveMs) {
          const u = easeIn(clamp01((ms - driveMs) / PILE_MS));
          const end = (frames - 1) * 2;
          at.x = lerp([c.track[end], center.x], u);
          at.y = lerp([c.track[end + 1], center.y], u);
          return at;
        }
        const f = Math.max(0, ms) / FRAME_MS;
        const i = Math.min(frames - 2, Math.floor(f));
        const t = f - i;
        at.x = lerp([c.track[i * 2], c.track[i * 2 + 2]], t);
        at.y = lerp([c.track[i * 2 + 1], c.track[i * 2 + 3]], t);
        return at;
      };
    });

    const crashing = createBeats(
      crashes,
      (c) => c.ms,
      (c, k) => {
        cover!.launchFrom(c.at, ringTargets(c.at, COINS, COIN_REACH));
        cover!.burst(c.at, 0.25);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(lerp(CRASH_SHAKE, c.ms / driveMs));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          crashing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const w of wisps)
            drawWispBetween(ctx, w, ms, now, WISP_SIZE * CAR, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
