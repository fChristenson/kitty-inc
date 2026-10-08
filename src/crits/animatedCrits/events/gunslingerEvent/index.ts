// the "Gunslinger" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while a gun wisp twirls round the clicked floor's
// button, faster and faster, then flips up high over the screen and, hanging
// there, fans off a shot at every empty spot in view, each with a muzzle
// flash: every hit a flash, a bang and a jolt as a new worker forms; the
// last shot lands in a huge blast and shake as the gun drops back to the
// button. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "gunslinger";
const MAX_HIRES = 6;
const FORM_MS = 300;
const TWIRL_R = 50;
const TWIRLS = 3;
const TOSS_MS = 220;
const PERCH = 230;
const DROP_MS = 260;
const SPEED = 2.6;
const LIFT = 30;
const FLASH_MS = 100;
const MUZZLE = 50;
const GUN = 0.5;
const BULLET = 0.3;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Shot {
  hire: RewardHire;
  bullet: Bullet;
  final: boolean;
}

export const forceGunslingerEvent = registerWispEvent(
  KEY,
  "Gunslinger",
  () => CONFIG.gunslingerEvent.chance,
  (floor, context, area) => {
    const { twirlMs, shotsMs, holdMs, mergeMs } = CONFIG.gunslingerEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const perch: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + PERCH,
    };
    const tossAt = twirlMs;
    let clock = tossAt + TOSS_MS;
    const shots: Shot[] = hires.map((hire, k) => {
      const firedAt = clock;
      clock += lerp(shotsMs, k / Math.max(1, hires.length - 1));
      return {
        hire,
        bullet: aimBullet(
          perch,
          { x: hire.x, y: hire.y - LIFT },
          firedAt,
          SPEED,
        ),
        final: k === hires.length - 1,
      };
    });
    const bullets = shots.map((s) => s.bullet);
    const lastFired = shots[shots.length - 1].bullet.firedAt;
    const endAt = Math.max(...bullets.map((b) => b.hitAt), lastFired + DROP_MS);
    const twirlEnd: Point = { x: button.x + TWIRL_R, y: button.y };
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      const t = Math.max(0, ms);
      if (t < tossAt) {
        const u = t / twirlMs;
        const a = Math.PI * 2 * TWIRLS * u * u;
        gunAt.x = button.x + Math.cos(a) * TWIRL_R;
        gunAt.y = button.y + Math.sin(a) * TWIRL_R * 0.6;
        return gunAt;
      }
      if (t < tossAt + TOSS_MS) {
        const e = easeOut((t - tossAt) / TOSS_MS);
        gunAt.x = lerp([twirlEnd.x, perch.x], e);
        gunAt.y = lerp([twirlEnd.y, perch.y], e);
        return gunAt;
      }
      const e = easeIn(clamp01((t - lastFired) / DROP_MS));
      gunAt.x = lerp([perch.x, button.x], e);
      gunAt.y = lerp([perch.y, button.y], e);
      return gunAt;
    };

    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s, k) => {
        giveHire(s.hire);
        if (s.final) {
          cover!.blast(s.bullet.to);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(s.bullet.to, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => hitting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * BULLET, true);
          for (const b of bullets)
            drawMuzzleFlash(
              ctx,
              perch,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            gun,
            ms,
            now,
            WISP_SIZE * GUN,
            0.7,
            0,
            lastFired + DROP_MS,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
