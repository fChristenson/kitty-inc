// the "Flare Gun" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while the clicked floor's button fires flare
// after flare up into the air with a flash and a bang, each wisp shooting up
// over an empty spot on a floor in view and hanging there, blazing and
// swaying; then it drops onto the spot with a pop and a jolt and a new
// worker forms there; the flares fly ever faster, the last landing in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
} from "../../../../shared/bullets";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "flareGun";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
// flares hang HANG px over their spot, swaying SWAY px
const HANG = 150;
const SWAY = 14;
const SPEED = 2.2;
const FLARE = 0.5;
const BULLET = WISP_SIZE * 0.4;
const MUZZLE = 56;
const FLASH_MS = 70;
const FIRE_SHAKE = 0.5;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceFlareGunEvent = registerWispEvent(
  KEY,
  "Flare Gun",
  () => CONFIG.flareGunEvent.chance,
  (floor, context) => {
    const { gapsMs, hangMs, dropMs, holdMs, mergeMs } = CONFIG.flareGunEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const flares = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const high: Point = { x: spot.x, y: spot.y - HANG };
      const shot = aimBullet(button, high, clock, SPEED);
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const drops = shot.hitAt + hangMs;
      const phase = Math.random() * Math.PI * 2;
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        shot,
        drops,
        lands: drops + dropMs,
        at: (ms: number): Point => {
          const sway = Math.sin((ms - shot.hitAt) / 90 + phase) * SWAY;
          if (ms < drops) {
            at.x = high.x + sway;
            at.y = high.y;
          } else {
            const u = easeIn(clamp01((ms - drops) / dropMs));
            at.x = high.x + sway * (1 - u);
            at.y = lerp([high.y, spot.y], u);
          }
          return at;
        },
      };
    });
    const last = flares.reduce((a, b) => (b.lands > a.lands ? b : a));
    const endAt = last.lands;
    const shots = flares.map((f) => f.shot);

    const firing = createBeats(
      shots,
      (s) => s.firedAt,
      () => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(FIRE_SHAKE);
      },
    );
    const landing = createBeats(
      flares,
      (f) => f.lands,
      (f, k) => {
        giveHire(f.hire);
        if (f === last) {
          cover!.blast(f.spot);
          return;
        }
        cover!.burst(f.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, flares.length - 1)));
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
          firing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          drawBullets(ctx, shots, ms, now, BULLET, true);
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              button,
              Math.atan2(s.dy, s.dx),
              (ms - s.firedAt) / FLASH_MS,
              MUZZLE,
            );
          for (const f of flares)
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              WISP_SIZE * FLARE,
              1,
              f.shot.hitAt,
              f.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
