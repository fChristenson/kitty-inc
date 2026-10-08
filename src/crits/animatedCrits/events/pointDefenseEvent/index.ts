// the "Point Defense" event (gunfire; worker perma tiers): it covers its
// crit, whose click freezes the screen while a turret wisp drops out of the
// clicked floor's button to the bottom of the screen and wisps come
// plunging down out of the sky, one at each worker; the turret snaps round
// and shoots each one down just over its worker's head, every hit a flash,
// a pop and a shower of sparks onto the worker, who climbs a perma tier with
// a jolt; they fall ever faster, the last shot down in a huge blast and
// shake. Then the crit's tier pays out
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
} from "../../../../shared/bullets";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "pointDefense";
const MAX_WORKERS = 6;
const BOTTOM = 80;
const DROP_MS = 220;
// incoming wisps are shot ABOVE px over their worker
const ABOVE = 90;
const SPEED = 2.8;
const TURRET = 0.6;
const INCOMING = 0.45;
const BULLET = WISP_SIZE * 0.32;
const MUZZLE = 50;
const FLASH_MS = 60;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forcePointDefenseEvent = registerWispEvent(
  KEY,
  "Point Defense",
  () => CONFIG.pointDefenseEvent.chance,
  (floor, context, area) => {
    const { gapsMs, fallMs, holdMs, mergeMs } = CONFIG.pointDefenseEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const turret: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BOTTOM,
    };
    let clock: number = DROP_MS + fallMs * 0.6;
    const incoming = workers.map((worker, k) => {
      const kill: Point = { x: worker.at.x, y: worker.at.y - ABOVE };
      const from: Point = {
        x: kill.x + (Math.random() - 0.5) * 160,
        y: area.top - 40,
      };
      const dies = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      const falls = dies - fallMs;
      const reach = Math.hypot(kill.x - turret.x, kill.y - turret.y);
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        kill,
        falls,
        dies,
        shot: aimBullet(turret, kill, dies - reach / SPEED, SPEED),
        at: (ms: number): Point => {
          const u = easeIn(clamp01((ms - falls) / fallMs));
          at.x = lerp([from.x, kill.x], u);
          at.y = lerp([from.y, kill.y], u);
          return at;
        },
      };
    });
    const last = incoming[incoming.length - 1];
    const endAt = last.dies;
    const shots = incoming.map((i) => i.shot);
    const turretAt: Point = { x: 0, y: 0 };
    const turretWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / DROP_MS));
      turretAt.x = lerp([button.x, turret.x], u);
      turretAt.y = lerp([button.y, turret.y], u);
      return turretAt;
    };

    const killing = createBeats(
      incoming,
      (i) => i.dies,
      (i, k) => {
        cover!.promote(i.worker);
        if (i === last) {
          cover!.blast(i.kill);
          return;
        }
        cover!.burst(i.kill, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, incoming.length - 1)));
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
        tick: (ms, now) => killing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const i of incoming)
            drawWispBetween(
              ctx,
              i.at,
              ms,
              now,
              WISP_SIZE * INCOMING,
              0.9,
              Math.max(0, i.falls),
              i.dies,
            );
          drawBullets(ctx, shots, ms, now, BULLET, true);
          for (const b of shots)
            drawMuzzleFlash(
              ctx,
              turret,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            turretWisp,
            ms,
            now,
            WISP_SIZE * TURRET,
            0.7,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
