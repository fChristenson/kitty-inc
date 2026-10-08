// the "Tommy Gun" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a tommy-gun wisp rises over the clicked floor's
// button and opens up, hosing a rattling stream of wisp bullets up the
// screen and sweeping it side to side, ever faster, every round that hits
// the screen's edge popping out coins and every swing a jolt; the drum
// runs dry in one long roaring burst that ends in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Bullet,
} from "../../../../shared/bullets";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "tommyGun";
const REWARD = 4;
// it sweeps between FAN rad either side of straight up, SWEEPS times,
// firing every FIRE_MS (down to its last value)
const FAN = 1.1;
const SWEEPS = 4;
const FIRE_MS: [number, number] = [70, 28];
const SPEED = 2.4;
const UP = 60;
const GUN = 0.6;
const BULLET = WISP_SIZE * 0.26;
const MUZZLE = 46;
const FLASH_MS = 40;
const HIT_COINS = 1;
const HIT_REACH: [number, number] = [10, 40];
const SWING_SHAKE: [number, number] = [0.4, 1];

export const forceTommyGunEvent = registerWispEvent(
  KEY,
  "Tommy Gun",
  () => CONFIG.tommyGunEvent.chance,
  (floor, context, area) => {
    const { riseMs, sprayMs, holdMs, mergeMs } = CONFIG.tommyGunEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const gun: Point = { x: button.x, y: button.y - UP };
    // ever faster sweeps: the aim at ms
    const aimAt = (ms: number) => {
      const u = Math.max(0, ms - riseMs) / sprayMs;
      return -Math.PI / 2 + Math.sin(u * u * SWEEPS * Math.PI) * FAN;
    };
    const bullets: Bullet[] = [];
    for (let ms: number = riseMs; ms < riseMs + sprayMs; ) {
      bullets.push(fireBullet(gun, aimAt(ms), ms, SPEED, area));
      ms += lerp(FIRE_MS, (ms - riseMs) / sprayMs);
    }
    const lastShot = riseMs + sprayMs;
    const endAt = Math.max(...bullets.map((b) => b.hitAt));
    const swings = Array.from(
      { length: SWEEPS },
      (_, k) => riseMs + sprayMs * Math.sqrt((k + 0.5) / SWEEPS),
    );
    const top: Point = { x: (area.left + area.right) / 2, y: area.top + 60 };
    const gunAt: Point = { x: 0, y: 0 };
    const gunWisp = (ms: number): Point | null => {
      if (ms > lastShot + 200) return null;
      const u = easeOut(Math.min(1, ms / riseMs));
      const kick = ms > riseMs && ms < lastShot ? Math.sin(ms / 12) * 2 : 0;
      gunAt.x = lerp([button.x, gun.x], u) + kick;
      gunAt.y = lerp([button.y, gun.y], u) + Math.abs(kick);
      return gunAt;
    };

    const hitting = createBeats(
      bullets,
      (b) => b.hitAt,
      (b, k) => {
        cover!.burst(b.to, 0.12);
        if (k % 2 === 0)
          cover!.launchFrom(b.to, ringTargets(b.to, HIT_COINS, HIT_REACH));
      },
    );
    const swinging = createBeats(
      swings,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SWING_SHAKE, k / (SWEEPS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(top),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          swinging.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          if (ms > riseMs && ms < lastShot)
            drawMuzzleFlash(
              ctx,
              gun,
              aimAt(ms),
              (ms % FLASH_MS) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            gunWisp,
            ms,
            now,
            WISP_SIZE * GUN,
            0.9,
            0,
            lastShot + 200,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
