// the "Dogfight" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while two fighter wisps scramble out of the clicked
// floor's button and tear round the screen in a dogfight, one on the
// other's tail through loops and rolls, the chaser hammering bursts of wisp
// bullets after it; every round that flies wide pops into coins at the
// screen's edge with a flash and a jolt; at last it nails the leader, which
// goes down in a huge blast and shake. Pays floor income × floor number ×
// REWARD
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
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Bullet,
} from "../../../../shared/bullets";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "dogfight";
const REWARD = 4;
const EDGE = 20;
// the leader flies a figure of eight WIDE by HIGH, LAPS laps; the chaser
// rides LAG ms behind it
const WIDE = 0.38;
const HIGH = 0.26;
const LAPS = 1.5;
const LAG = 180;
const BURST = 3;
const ROUND_MS = 45;
const SPEED = 2.6;
const FIGHTER = 0.5;
const BULLET = WISP_SIZE * 0.28;
const MUZZLE = 40;
const FLASH_MS = 50;
const COINS = 6;
const COIN_REACH: [number, number] = [20, 90];
const POP_SHAKE: [number, number] = [0.25, 0.8];

export const forceDogfightEvent = registerWispEvent(
  KEY,
  "Dogfight",
  () => CONFIG.dogfightEvent.chance,
  (floor, context, area) => {
    const { fightMs, burstsMs, holdMs, mergeMs } = CONFIG.dogfightEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 30,
    };
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const ax = (area.right - area.left) * WIDE;
    const ay = (area.bottom - area.top) * HIGH;
    const pathAt = (ms: number, into: Point): Point => {
      if (ms < 0) {
        into.x = button.x;
        into.y = button.y;
        return into;
      }
      const u = clamp01(ms / fightMs);
      const a = u * LAPS * Math.PI * 2;
      const enter = clamp01(ms / 300);
      into.x = lerp([button.x, center.x + Math.sin(a) * ax], enter);
      into.y = lerp([button.y, center.y + Math.sin(2 * a) * ay * 0.8], enter);
      return into;
    };
    const leaderAt: Point = { x: 0, y: 0 };
    const leader = (ms: number): Point => pathAt(ms + LAG, leaderAt);
    const chaserAt: Point = { x: 0, y: 0 };
    const chaser = (ms: number): Point => pathAt(ms, chaserAt);
    // bursts fired up the chaser's heading, flying wide to the edge
    const misses: Bullet[] = [];
    const muzzles: { at: number; from: Point; angle: number }[] = [];
    const killAt = fightMs - LAG;
    for (let t = 400, k = 0; t < killAt - 200; k++) {
      const from = { ...pathAt(t, { x: 0, y: 0 }) };
      const ahead = pathAt(t + 40, { x: 0, y: 0 });
      const angle =
        Math.atan2(ahead.y - from.y, ahead.x - from.x) +
        (k % 2 === 0 ? 0.25 : -0.25);
      for (let r = 0; r < BURST; r++) {
        misses.push(fireBullet(from, angle, t + r * ROUND_MS, SPEED, box));
        muzzles.push({ at: t + r * ROUND_MS, from, angle });
      }
      t += lerp(burstsMs, t / killAt);
    }
    const fireAt = killAt - 200;
    const from = { ...pathAt(fireAt, { x: 0, y: 0 }) };
    // lead the target: aim where the leader will be when the round arrives
    const target: Point = { x: 0, y: 0 };
    let arrives = killAt;
    for (let i = 0; i < 4; i++) {
      pathAt(arrives + LAG, target);
      arrives =
        fireAt + Math.hypot(target.x - from.x, target.y - from.y) / SPEED;
    }
    const kill = aimBullet(from, target, fireAt, SPEED);
    const killSpot = kill.to;
    const endAt = kill.hitAt;
    const bullets = [...misses, kill];
    muzzles.push({
      at: kill.firedAt,
      from,
      angle: Math.atan2(kill.dy, kill.dx),
    });

    const popping = createBeats(
      misses,
      (b) => b.hitAt,
      (b, k) => {
        cover!.launchFrom(b.to, ringTargets(b.to, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        if (k % 3 === 0) playBloop();
        shakeScreen(lerp(POP_SHAKE, b.hitAt / endAt));
      },
    );
    const downing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(killSpot),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          downing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const m of muzzles)
            drawMuzzleFlash(
              ctx,
              m.from,
              m.angle,
              (ms - m.at) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            leader,
            ms,
            now,
            WISP_SIZE * FIGHTER,
            0.6,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            chaser,
            ms,
            now,
            WISP_SIZE * FIGHTER,
            0.9,
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
