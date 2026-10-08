// the "Recoil" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a gun wisp pops out of the clicked floor's button
// and fires a round at the screen's edge, the kick hurling it backwards
// across the screen; it fires again from wherever it skids to, and again,
// propelled round the screen by its own recoil, every shot a muzzle flash
// and a slug of cash bursting into coins where it hits the edge, ever
// faster; the last shot it turns on the total and blasts a huge round into
// it in a huge blast and shake. Pays floor income × floor number × REWARD
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
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Bullet,
} from "../../../../shared/bullets";
import {
  pourLine,
  pourDurationMs,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "recoil";
const REWARD = 4;
const SHOTS = 8;
const EDGE = 60;
const MARGIN = 220;
const KICK: [number, number] = [260, 420];
const JITTER = 0.6;
const SPEED = 2.4;
const FLASH_MS = 80;
const FLASH = 60;
const COINS = 14;
const GUN = 0.6;
const SHOT_SHAKE: [number, number] = [0.5, 1.3];

interface Shot {
  from: Point;
  to: Point;
  angle: number;
  firedAt: number;
  bullet: Bullet;
}

export const forceRecoilEvent = registerWispEvent(
  KEY,
  "Recoil",
  () => CONFIG.recoilEvent.chance,
  (floor, context, area) => {
    const { shotsMs, finalMs, holdMs, mergeMs } = CONFIG.recoilEvent;
    const total = totalSpot(area);
    const edges = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE * 3,
      bottom: area.bottom - EDGE,
    };
    const room = {
      left: area.left + MARGIN,
      right: area.right - MARGIN,
      top: area.top + MARGIN + 140,
      bottom: area.bottom - MARGIN,
    };
    const mid: Point = {
      x: (room.left + room.right) / 2,
      y: (room.top + room.bottom) / 2,
    };
    const clampIn = (p: Point): Point => ({
      x: Math.min(room.right, Math.max(room.left, p.x)),
      y: Math.min(room.bottom, Math.max(room.top, p.y)),
    });
    let at = clampIn(getButtonCenter(context.isGroundFloor));
    let clock = 0;
    const shots: Shot[] = Array.from({ length: SHOTS }, (_, k) => {
      const t = k / (SHOTS - 1);
      // fired away from the middle, so the kick hurls it back across
      const away = Math.atan2(at.y - mid.y, at.x - mid.x) || -Math.PI / 2;
      const angle = away + (Math.random() - 0.5) * JITTER;
      const firedAt = clock;
      clock += lerp(shotsMs, t);
      const kick = lerp(KICK, t);
      const to = clampIn({
        x: at.x - Math.cos(angle) * kick,
        y: at.y - Math.sin(angle) * kick,
      });
      const shot = {
        from: at,
        to,
        angle,
        firedAt,
        bullet: fireBullet(at, angle, firedAt, SPEED, edges),
      };
      at = to;
      return shot;
    });
    const finalAt = clock;
    const last = at;
    const finalBullet = aimBullet(last, total, finalAt, SPEED * 1.4);
    const finalAngle = Math.atan2(total.y - last.y, total.x - last.x);
    const endAt = finalBullet.hitAt;
    const recoilTo = clampIn({
      x: last.x - Math.cos(finalAngle) * KICK[1],
      y: last.y - Math.sin(finalAngle) * KICK[1],
    });
    const bullets = [...shots.map((s) => s.bullet), finalBullet];
    const straight = (a: Point, b: Point) =>
      sampleLine(
        (u) => ({ x: lerp([a.x, b.x], u), y: lerp([a.y, b.y], u) }),
        12,
      );
    const slugLines = shots.map((s) => straight(s.bullet.from, s.bullet.to));
    const finalLine = straight(last, total);
    const slug = (b: Bullet): Pour => ({
      coinsAlong: 110,
      width: 22,
      streamMs: 70,
      travelMs: Math.max(80, b.hitAt - b.firedAt),
    });
    const finalPour: Pour = {
      coinsAlong: 260,
      width: 40,
      streamMs: finalMs,
      travelMs: Math.max(120, endAt - finalAt),
    };
    const durationMs = Math.max(
      pourDurationMs(finalAt, finalPour),
      endAt + holdMs + mergeMs,
    );
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      if (ms >= finalAt) {
        const u = easeOut(clamp01((ms - finalAt) / 300));
        gunAt.x = lerp([last.x, recoilTo.x], u);
        gunAt.y = lerp([last.y, recoilTo.y], u);
        return gunAt;
      }
      let s = shots[0];
      for (const shot of shots) if (ms >= shot.firedAt) s = shot;
      const next = shots[shots.indexOf(s) + 1];
      const span = (next ? next.firedAt : finalAt) - s.firedAt;
      const u = easeOut(clamp01((ms - s.firedAt) / span));
      gunAt.x = lerp([s.from.x, s.to.x], u);
      gunAt.y = lerp([s.from.y, s.to.y], u);
      return gunAt;
    };

    const firing = createBeats(
      [...shots.map((s) => s.firedAt), finalAt],
      (ms) => ms,
      (_, k) => {
        if (k < SHOTS) pourLine(cover!, slugLines[k], slug(shots[k].bullet));
        else pourLine(cover!, finalLine, finalPour);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SHOT_SHAKE, k / SHOTS));
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s) => {
        const to = s.bullet.to;
        cover!.burst(to, 0.5);
        cover!.launchFrom(
          to,
          clampTargetsY(
            ringTargets(to, COINS, [40, 150]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          for (const s of shots) {
            const t = (ms - s.firedAt) / FLASH_MS;
            if (t > 0 && t < 1) drawMuzzleFlash(ctx, s.from, s.angle, t, FLASH);
          }
          const t = (ms - finalAt) / (FLASH_MS * 2);
          if (t > 0 && t < 1)
            drawMuzzleFlash(ctx, last, finalAngle, t, FLASH * 2);
          drawBullets(ctx, bullets, ms, now, undefined, true);
          drawWispBetween(
            ctx,
            gun,
            ms,
            now,
            WISP_SIZE * GUN,
            0.7,
            0,
            endAt + 300,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
