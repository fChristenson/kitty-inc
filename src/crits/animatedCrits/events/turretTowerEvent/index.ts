// the "Turret Tower" event (gunfire; worker perma tiers): it covers its
// crit, whose click freezes the screen while turret wisps stack up out of
// the clicked floor's button one on another into a tower at the side of the
// screen, one turret for every worker; from the top down each turret swings
// onto its worker, flickers an aim laser, and rattles off a burst, muzzle
// flashing, its last bullet striking the worker in a pop and a jolt as they
// climb a perma tier; the bottom turret's burst lands in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { drawAimLaser } from "../../../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "turretTower";
const MAX_WORKERS = 5;
const EDGE = 70;
const STACK = 56;
const STACK_MS = 90;
const BURST = 3;
const SHOT_MS = 60;
const SPEED = 2.6;
const FLASH_MS = 70;
const FLASH = 42;
const TURRET = 0.45;
const BULLET = WISP_SIZE * 0.3;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceTurretTowerEvent = registerWispEvent(
  KEY,
  "Turret Tower",
  () => CONFIG.turretTowerEvent.chance,
  (floor, context, area) => {
    const { aimMs, turretsMs, holdMs, mergeMs } = CONFIG.turretTowerEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const side = button.x > (area.left + area.right) / 2 ? -1 : 1;
    const baseX = side > 0 ? area.left + EDGE : area.right - EDGE;
    const baseY = (area.top + area.bottom) / 2 + (workers.length * STACK) / 2;
    const builtAt = STACK_MS * workers.length;
    let clock: number = builtAt;
    const turrets = workers.map((worker, k) => {
      // the first worker's turret on top of the tower
      const seat: Point = {
        x: baseX,
        y: baseY - (workers.length - 1 - k) * STACK,
      };
      const stacks = (workers.length - 1 - k) * STACK_MS;
      const aims = clock;
      const fires = aims + aimMs;
      const shots: Bullet[] = Array.from({ length: BURST }, (_, i) =>
        aimBullet(seat, worker.at, fires + i * SHOT_MS, SPEED),
      );
      clock = fires + lerp(turretsMs, k / Math.max(1, workers.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        seat,
        aims,
        fires,
        shots,
        lands: shots[BURST - 1].hitAt,
        at: (ms: number): Point => {
          const u = easeOutBack(clamp01((ms - stacks) / (STACK_MS * 2)));
          at.x = lerp([button.x, seat.x], u);
          at.y = lerp([button.y, seat.y], u);
          return at;
        },
      };
    });
    const last = turrets[turrets.length - 1];
    const endAt = last.lands;
    const bullets = turrets.flatMap((t) => t.shots);

    const stacking = createBeats(
      turrets,
      (t) => (workers.length - 1 - turrets.indexOf(t)) * STACK_MS + STACK_MS,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      turrets,
      (t) => t.lands,
      (t, k) => {
        cover!.promote(t.worker);
        if (t === last) {
          cover!.blast(t.worker.at);
          return;
        }
        cover!.burst(t.worker.at, 0.55);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, turrets.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          stacking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const t of turrets) {
            if (ms >= t.aims && ms < t.fires)
              drawAimLaser(ctx, t.seat, t.worker.at);
            for (const b of t.shots) {
              const f = (ms - b.firedAt) / FLASH_MS;
              if (f > 0 && f < 1)
                drawMuzzleFlash(ctx, t.seat, Math.atan2(b.dy, b.dx), f, FLASH);
            }
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * TURRET,
              ms >= t.aims && ms < t.lands ? 1 : 0.4,
              0,
              endAt,
            );
          }
          drawBullets(ctx, bullets, ms, now, BULLET, true);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
