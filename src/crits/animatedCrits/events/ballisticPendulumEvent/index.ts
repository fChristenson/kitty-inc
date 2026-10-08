// the "Ballistic Pendulum" event (gunfire; crit tiers): it covers its crit,
// whose click freezes the screen while a bob wisp drops to hang on a glowing
// thread under each income bar; an aim laser flickers onto one from the
// screen's edge and a shot cracks out of a muzzle flash and slams into it,
// and the bob swings up so hard it smashes into the bar above with a flash,
// a crack and a jolt, jumping it a crit tier, then swings on loose; the
// next bob is shot quicker, the last in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam } from "../../../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "ballisticPendulum";
const MAX_BARS = 4;
const THREAD = 170;
const EDGE = 40;
const SPEED = 3.6;
const SWING_MS = 140;
// after the smash it swings back loose, ringing down
const RING_MS = 520;
const DAMP_MS = 600;
const DROP_MS = 200;
const BOB = 0.55;
const BULLET = 0.5;
const FLASH_MS = 100;
const FLASH = 90;
const SMASH_SHAKE: [number, number] = [0.7, 1.4];

interface Shot {
  bar: RewardBar;
  pivot: Point;
  bob: Point;
  dir: number;
  bullet: Bullet;
  angle: number;
  aims: number;
  smashes: number;
  smash: Point;
  at: (ms: number) => Point;
}

export const forceBallisticPendulumEvent = registerWispEvent(
  KEY,
  "Ballistic Pendulum",
  () => CONFIG.ballisticPendulumEvent.chance,
  (floor, context, area) => {
    const { firstMs, shotsMs, aimMs, holdMs, mergeMs } =
      CONFIG.ballisticPendulumEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock: number = firstMs;
    const shots: Shot[] = bars.map((bar, k) => {
      const pivot: Point = { x: bar.center.x, y: bar.box.y + bar.box.height };
      const bob: Point = { x: pivot.x, y: pivot.y + THREAD };
      // shot from whichever edge is farther, so it swings toward the middle's far side
      const fromLeft = pivot.x > (area.left + area.right) / 2;
      const gun: Point = {
        x: fromLeft ? area.left + EDGE : area.right - EDGE,
        y: bob.y,
      };
      const dir = fromLeft ? 1 : -1;
      const bullet = aimBullet(gun, bob, clock, SPEED);
      const smashes = bullet.hitAt + SWING_MS;
      const spot: Point = { x: 0, y: 0 };
      const shot: Shot = {
        bar,
        pivot,
        bob,
        dir,
        bullet,
        angle: Math.atan2(bullet.dy, bullet.dx),
        aims: clock - aimMs,
        smashes,
        smash: { x: pivot.x + dir * THREAD, y: pivot.y },
        at: (ms) => {
          let theta = 0;
          if (ms >= bullet.hitAt && ms < smashes)
            theta = (Math.PI / 2) * easeOut((ms - bullet.hitAt) / SWING_MS);
          else if (ms >= smashes) {
            const t = ms - smashes;
            theta =
              (Math.PI / 2) *
              Math.exp(-t / DAMP_MS) *
              Math.cos((Math.PI * 2 * t) / RING_MS);
          }
          const drop = easeOut(clamp01(ms / DROP_MS));
          spot.x = pivot.x + dir * Math.sin(theta) * THREAD;
          spot.y = pivot.y + Math.cos(theta) * THREAD * drop;
          return spot;
        },
      };
      clock += lerp(shotsMs, k / Math.max(1, bars.length - 1));
      return shot;
    });
    const last = shots[shots.length - 1];
    const endAt = last.smashes;
    const bullets = shots.map((s) => s.bullet);

    const smashing = createBeats(
      shots,
      (s) => s.smashes,
      (s, k) => {
        cover!.tierUp(s.bar, s.smash);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.smash);
          return;
        }
        cover!.burst(s.smash, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SMASH_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const firing = createBeats(
      shots,
      (s) => s.bullet.firedAt,
      () => {
        if (cover!.isLive()) shakeScreen(0.3);
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
          firing.tick(ms, now);
          smashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const s of shots) {
            const bob = s.at(ms);
            drawBeam(ctx, s.pivot, bob, 3, 0.5);
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * BOB,
              0.7,
              0,
              endAt + 400,
            );
            if (ms >= s.aims && ms < s.bullet.firedAt)
              drawAimLaser(ctx, s.bullet.from, s.bullet.to);
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, s.bullet.from, s.angle, t, FLASH);
          }
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * BULLET, true);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
