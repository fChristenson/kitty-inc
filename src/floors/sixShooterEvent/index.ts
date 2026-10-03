// the "Six-Shooter" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while a gunslinger wisp rises off the clicked
// floor's button and fans the hammer, firing shot after shot, ever faster,
// muzzle flashing; each wisp bullet ricochets off the screen's edge with a
// ping and a flash and curves down onto an empty spot on a floor in view,
// where it hits with a bang and a jolt and a new worker drops in; the last
// lands in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "sixShooter";
const MAX_SHOTS = 6;
// the gunslinger hovers RISE px over the button; bullets fly SPEED px per
// ms and land ABOVE px over a hire's spot
const RISE = 90;
const SPEED = 2.4;
const ABOVE = 30;
const BULLET = WISP_SIZE * 0.4;
const GUN = 0.8;
const MUZZLE = 55;
const FLASH_MS = 90;
const FORM_MS = 280;
const HIT_SHAKE: [number, number] = [0.6, 1.4];

export const forceSixShooterEvent = registerWispEvent(
  KEY,
  "Six-Shooter",
  () => CONFIG.sixShooterEvent.chance,
  (floor, context, area) => {
    const { drawMs, gapsMs, holdMs, mergeMs } = CONFIG.sixShooterEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_SHOTS);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const gun: Point = { x: button.x, y: button.y - RISE };
    let clock: number = drawMs;
    const shots = hires.map((hire, k) => {
      const firedAt = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const spot: Point = { x: hire.x, y: hire.y - ABOVE };
      // off the edge on the spot's side, high above it
      const edge: Point = {
        x: spot.x < gun.x ? area.left + 10 : area.right - 10,
        y: lerp(
          [area.top + 60, Math.min(spot.y, gun.y)],
          0.3 + 0.4 * Math.random(),
        ),
      };
      const out = aimBullet(gun, edge, firedAt, SPEED);
      const back = aimBullet(edge, spot, out.hitAt, SPEED);
      return {
        hire,
        spot,
        edge,
        firedAt,
        angle: Math.atan2(edge.y - gun.y, edge.x - gun.x),
        out,
        back,
      };
    });
    const bullets: Bullet[] = shots.flatMap((s) => [s.out, s.back]);
    const endAt = Math.max(...shots.map((s) => s.back.hitAt));
    const landings = [...shots].sort((a, b) => a.back.hitAt - b.back.hitAt);
    const gunAt: Point = { x: 0, y: 0 };
    const gunslinger = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      const u = easeOut(clamp01(ms / drawMs));
      gunAt.x = gun.x;
      gunAt.y = lerp([button.y, gun.y], u);
      return gunAt;
    };

    const pinging = createBeats(
      shots,
      (s) => s.out.hitAt,
      (s) => {
        cover!.burst(s.edge, 0.25);
        if (cover!.isLive()) playBloop();
      },
    );
    const firing = createBeats(
      shots,
      (s) => s.firedAt,
      () => {
        if (cover?.isLive()) shakeScreen(0.4);
      },
    );
    const landing = createBeats(
      landings,
      (s) => s.back.hitAt,
      (s, k) => {
        giveHire(s.hire);
        if (k === landings.length - 1) {
          cover!.blast(s.spot);
          return;
        }
        cover!.burst(s.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, landings.length - 1)));
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
          pinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          drawWispBetween(
            ctx,
            gunslinger,
            ms,
            now,
            WISP_SIZE * GUN,
            0.8,
            0,
            endAt,
          );
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              gun,
              s.angle,
              (ms - s.firedAt) / FLASH_MS,
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
