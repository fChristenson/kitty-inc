// the "Shooting Gallery" event (gunfire; free hires): it covers its crit,
// whose click freezes the screen while target wisps pop up over every empty
// spot on the floors in view, sliding back and forth like ducks in a
// fairground shooting gallery; a gun off the bottom of the screen opens up
// on them, muzzle flashing, rattling off bursts of wisp bullets, ever
// faster, the first shots of each burst whizzing past and the last
// knocking the target down with a flash, a bang and a jolt as a new worker
// drops in where it stood; the last target goes down in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Bullet,
} from "../../../../shared/bullets";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "shootingGallery";
const MAX_HIRES = 4;
// targets hover ABOVE px over their spot, sliding SLIDE px either side
const ABOVE = 50;
const SLIDE = 50;
const SLIDE_RATE = 0.006;
const POP_MS = 180;
const TARGET = 0.6;
// each burst is SHOTS shots SHOT_GAP ms apart, the misses MISS px off
const SHOTS = 3;
const SHOT_GAP = 70;
const MISS = 70;
// bullets fly SPEED px per ms, BULLET of a wisp
const SPEED = 2.6;
const BULLET = WISP_SIZE * 0.4;
const MUZZLE = 60;
const FLASH_MS = 90;
const FORM_MS = 280;
const HIT_SHAKE: [number, number] = [0.7, 1.5];

export const forceShootingGalleryEvent = registerWispEvent(
  KEY,
  "Shooting Gallery",
  () => CONFIG.shootingGalleryEvent.chance,
  (floor, context, area) => {
    const { popMs, burstsMs, holdMs, mergeMs } = CONFIG.shootingGalleryEvent;
    const hires = findRewardHires(floor, context)
      .sort((a, b) => a.y - b.y)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const muzzle: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom + 20,
    };
    const box = {
      left: area.left - 100,
      right: area.right + 100,
      top: area.top - 100,
      bottom: area.bottom + 100,
    };
    const targets = hires.map((hire, k) => {
      const phase = Math.random() * Math.PI * 2;
      const point: Point = { x: 0, y: 0 };
      const spot = (ms: number, into: Point): Point => {
        into.x = hire.x + Math.sin(ms * SLIDE_RATE + phase) * SLIDE;
        into.y = hire.y - ABOVE;
        return into;
      };
      return { hire, k, spot, point, downAt: 0 };
    });
    // each burst: misses whizzing past, the last shot aimed to meet its target
    const bullets: Bullet[] = [];
    const flashes: { at: number; angle: number }[] = [];
    let clock: number = popMs;
    for (const t of targets) {
      clock += lerp(burstsMs, t.k / Math.max(1, targets.length - 1));
      for (let s = 0; s < SHOTS; s++) {
        const firedAt = clock + s * SHOT_GAP;
        let aim = t.spot(firedAt, { x: 0, y: 0 });
        // lead the target: aim where it'll be when the shot gets there
        for (let i = 0; i < 2; i++) {
          const flight = Math.hypot(aim.x - muzzle.x, aim.y - muzzle.y) / SPEED;
          aim = t.spot(firedAt + flight, aim);
        }
        const angle = Math.atan2(aim.y - muzzle.y, aim.x - muzzle.x);
        flashes.push({ at: firedAt, angle });
        if (s < SHOTS - 1) {
          const off = (s % 2 === 0 ? -1 : 1) * MISS;
          bullets.push(
            fireBullet(
              muzzle,
              Math.atan2(aim.y - muzzle.y, aim.x + off - muzzle.x),
              firedAt,
              SPEED,
              box,
            ),
          );
          continue;
        }
        const shot = aimBullet(muzzle, aim, firedAt, SPEED);
        bullets.push(shot);
        t.downAt = shot.hitAt;
      }
      clock += SHOTS * SHOT_GAP;
    }
    const endAt = Math.max(...targets.map((t) => t.downAt));
    const hitting = targets.map((t) => ({ t, at: t.downAt }));
    const wisps = targets.map((t) => (ms: number): Point | null => {
      if (ms < 0 || ms >= t.downAt) return null;
      t.spot(ms, t.point);
      const grow = easeOut(clamp01(ms / POP_MS));
      t.point.y += (1 - grow) * ABOVE;
      return t.point;
    });

    const popping = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const knocking = createBeats(
      hitting,
      (h) => h.at,
      (h, k) => {
        const t = k / Math.max(1, hitting.length - 1);
        giveHire(h.t.hire);
        const at = h.t.spot(h.at, { x: 0, y: 0 });
        if (k === hitting.length - 1) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const rattling = createBeats(
      flashes,
      (f) => f.at,
      () => {
        if (cover?.isLive()) shakeScreen(0.25);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          popping.tick(ms, now);
          knocking.tick(ms, now);
          rattling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          targets.forEach((t, i) =>
            drawWispBetween(
              ctx,
              wisps[i],
              ms,
              now,
              WISP_SIZE * TARGET,
              0.6,
              0,
              t.downAt,
            ),
          );
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              muzzle,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
