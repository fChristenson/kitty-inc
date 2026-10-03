// the "Snapback" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while the clicked floor's button fires a round at
// every empty spot, rattling off one after another with muzzle flashes;
// each round overshoots its spot, slows to a dead stop in mid-air and hangs
// there quivering, then snaps back like it's on elastic and slams into the
// spot with a crack, a flash and a jolt as a new worker forms there; ever
// faster, the last snapping back in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "snapback";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 20;
const OVERSHOOT = 170;
// the flight's share spent flying out, then hanging
const OUT = 0.5;
const HANG = 0.2;
const QUIVER = 4;
const FLASH_MS = 90;
const FLASH = 50;
const SNAP_SHAKE: [number, number] = [0.6, 1.3];

// a round past `spot` to `over`, hanging there, then snapping back onto `spot`
function snapRound(
  from: Point,
  spot: Point,
  firedAt: number,
  hitAt: number,
): Bullet {
  const dx = spot.x - from.x;
  const dy = spot.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const over = {
    x: spot.x + (dx / length) * OVERSHOOT,
    y: spot.y + (dy / length) * OVERSHOOT,
  };
  const at: Point = { x: 0, y: 0 };
  return {
    from,
    dx: dx / length,
    dy: dy / length,
    speed: (length + OVERSHOOT) / ((hitAt - firedAt) * OUT),
    firedAt,
    hitAt,
    to: spot,
    at: (ms) => {
      if (ms < firedAt || ms >= hitAt) return null;
      const u = (ms - firedAt) / (hitAt - firedAt);
      if (u < OUT) {
        const e = easeOut(u / OUT);
        at.x = lerp([from.x, over.x], e);
        at.y = lerp([from.y, over.y], e);
      } else if (u < OUT + HANG) {
        at.x = over.x + Math.sin(ms / 9) * QUIVER;
        at.y = over.y + Math.cos(ms / 7) * QUIVER;
      } else {
        const e = easeIn((u - OUT - HANG) / (1 - OUT - HANG));
        at.x = lerp([over.x, spot.x], e);
        at.y = lerp([over.y, spot.y], e);
      }
      return at;
    },
  };
}

export const forceSnapbackEvent = registerWispEvent(
  KEY,
  "Snapback",
  () => CONFIG.snapbackEvent.chance,
  (floor, context) => {
    const { shotsMs, flightMs, holdMs, mergeMs } = CONFIG.snapbackEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const gun = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const shots = hires.map((hire: RewardHire, k) => {
      const t = k / Math.max(1, hires.length - 1);
      const spot = { x: hire.x, y: hire.y - LIFT };
      const firedAt = clock;
      clock += lerp(shotsMs, t);
      const bullet = snapRound(gun, spot, firedAt, firedAt + lerp(flightMs, t));
      return {
        hire,
        spot,
        bullet,
        angle: Math.atan2(spot.y - gun.y, spot.x - gun.x),
      };
    });
    const endAt = Math.max(...shots.map((s) => s.bullet.hitAt));
    const last = shots.find((s) => s.bullet.hitAt === endAt)!;
    const bullets = shots.map((s) => s.bullet);

    const snapping = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.spot);
          return;
        }
        cover!.burst(s.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SNAP_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => snapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt) return;
          for (const s of shots) {
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1) drawMuzzleFlash(ctx, gun, s.angle, t, FLASH);
          }
          drawBullets(ctx, bullets, ms, now, undefined, true);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
