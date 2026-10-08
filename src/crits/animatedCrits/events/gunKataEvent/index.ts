// the "Gun Kata" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while a gunner wisp flips out of the clicked
// floor's button and darts from pose to pose between empty spots on the
// floors in view, each time snapping off two shots at once in opposite
// directions, muzzles flashing both ways; each shot lands on an empty spot
// with a pop and a jolt and a new worker forms there; the last pose fires a
// ring every way in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  bulletRing,
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

const KEY = "gunKata";
const MAX_HIRES = 6;
const FORM_MS = 300;
const SPEED = 2.4;
const RING = 20;
const GUNNER = 0.7;
const BULLET = WISP_SIZE * 0.34;
const MUZZLE = 48;
const FLASH_MS = 60;
// a lone last spot is shot from this far off
const LONE = 160;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceGunKataEvent = registerWispEvent(
  KEY,
  "Gun Kata",
  () => CONFIG.gunKataEvent.chance,
  (floor, context, area) => {
    const { dartMs, posesMs, holdMs, mergeMs } = CONFIG.gunKataEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const spotOf = (h: RewardHire): Point => ({ x: h.x, y: h.y - 30 });
    const poses: { at: Point; fires: number }[] = [];
    const shots: { hire: RewardHire; b: Bullet }[] = [];
    let clock: number = dartMs;
    const pairs = Math.ceil(hires.length / 2);
    for (let p = 0; p < pairs; p++) {
      const a = spotOf(hires[p * 2]);
      const second = hires[p * 2 + 1];
      const b = second ? spotOf(second) : null;
      const at: Point = b
        ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        : {
            x: a.x + (a.x > (area.left + area.right) / 2 ? -LONE : LONE),
            y: a.y,
          };
      poses.push({ at, fires: clock });
      shots.push({ hire: hires[p * 2], b: aimBullet(at, a, clock, SPEED) });
      if (second && b)
        shots.push({ hire: second, b: aimBullet(at, b, clock, SPEED) });
      clock += lerp(posesMs, p / Math.max(1, pairs - 1));
    }
    const lastPose = poses[poses.length - 1];
    const ringAt = clock;
    const ring = bulletRing(lastPose.at, RING, ringAt, SPEED, area);
    const endAt = Math.max(ringAt + 300, ...shots.map((s) => s.b.hitAt));
    const bullets = [...shots.map((s) => s.b), ...ring];

    const gunnerAt: Point = { x: 0, y: 0 };
    const gunner = (ms: number): Point | null => {
      if (ms > ringAt + 200) return null;
      let from: Point = button;
      let leaves = 0;
      for (const pose of poses) {
        if (ms < pose.fires) {
          const u = easeOutBack(
            Math.min(1, (ms - leaves) / Math.min(dartMs, pose.fires - leaves)),
          );
          gunnerAt.x = lerp([from.x, pose.at.x], u);
          gunnerAt.y = lerp([from.y, pose.at.y], u);
          return gunnerAt;
        }
        from = pose.at;
        leaves = pose.fires + FLASH_MS;
      }
      gunnerAt.x = lastPose.at.x;
      gunnerAt.y = lastPose.at.y;
      return gunnerAt;
    };

    const darting = createBeats(
      poses,
      (p) => p.fires - dartMs,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.b.hitAt,
      (s, k) => {
        giveHire(s.hire);
        cover!.burst(s.b.to, 0.35);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const finale = createBeats(
      [ringAt],
      (ms) => ms,
      () => cover!.blast(lastPose.at),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          darting.tick(ms, now);
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              s.b.from,
              Math.atan2(s.b.dy, s.b.dx),
              (ms - s.b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            gunner,
            ms,
            now,
            WISP_SIZE * GUNNER,
            0.8,
            0,
            ringAt + 200,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
