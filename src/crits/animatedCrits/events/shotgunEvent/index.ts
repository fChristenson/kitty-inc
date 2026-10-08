// the "Shotgun" event (gunfire; worker perma tiers): it covers its crit,
// whose click freezes the screen while a gun wisp leaps out of the clicked
// floor's button, sidles up beside a worker in view and pumps, chk-chk,
// then fires a booming spray of wisp pellets into it, a huge muzzle flash
// and a kick that knocks it back, the pellets peppering the worker in a
// flurry of pops that lights it up a perma tier; it pumps and blasts the
// next and the next, ever faster; the last shot goes off in a huge blast
// and shake. Then the crit's tier pays out
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
import { lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "shotgun";
const MAX_WORKERS = 4;
const PELLETS = 9;
// the gun stands OFF px to a worker's side, sprays SPREAD px wide on it,
// pumps PUMP px and kicks KICK px back
const OFF = 150;
const SPREAD = 36;
const PUMP = 10;
const KICK = 26;
const SPEED = 3;
const GUN = 0.6;
const PELLET = WISP_SIZE * 0.22;
const MUZZLE = 90;
const FLASH_MS = 120;
const HIT_SHAKE: [number, number] = [0.9, 1.6];

export const forceShotgunEvent = registerWispEvent(
  KEY,
  "Shotgun",
  () => CONFIG.shotgunEvent.chance,
  (floor, context, area) => {
    const { moveMs, pumpMs, holdMs, mergeMs } = CONFIG.shotgunEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const bullets: Bullet[] = [];
    let clock = 0;
    let from: Point = button;
    const shots = workers.map((worker, k) => {
      const side = worker.at.x - OFF > area.left + 20 ? -1 : 1;
      const stand: Point = { x: worker.at.x + side * OFF, y: worker.at.y - 10 };
      const pump = lerp(pumpMs, k / Math.max(1, workers.length - 1));
      const leaves = clock;
      const arrives = leaves + moveMs;
      const fires = arrives + pump;
      let hits = 0;
      for (let i = 0; i < PELLETS; i++) {
        const target: Point = {
          x: worker.at.x + (Math.random() - 0.5) * SPREAD * 0.5,
          y: worker.at.y + (Math.random() - 0.5) * SPREAD,
        };
        const b = aimBullet(
          stand,
          target,
          fires,
          SPEED * (0.9 + 0.2 * Math.random()),
        );
        bullets.push(b);
        hits = Math.max(hits, b.hitAt);
      }
      const shot = {
        worker,
        stand,
        from,
        side,
        leaves,
        arrives,
        fires,
        hits,
        angle: Math.atan2(worker.at.y - stand.y, worker.at.x - stand.x),
      };
      clock = hits + 60;
      from = stand;
      return shot;
    });
    const last = shots[shots.length - 1];
    const endAt = last.hits;
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      let s = shots[0];
      for (const shot of shots) if (ms >= shot.leaves) s = shot;
      if (ms < s.arrives) {
        const u = smoothstep((ms - s.leaves) / moveMs);
        gunAt.x = lerp([s.from.x, s.stand.x], u);
        gunAt.y = lerp([s.from.y, s.stand.y], u) - Math.sin(Math.PI * u) * 50;
        return gunAt;
      }
      // two pumps, then the kick
      const pumping = (ms - s.arrives) / (s.fires - s.arrives);
      const kick = ms > s.fires ? Math.max(0, 1 - (ms - s.fires) / 160) : 0;
      gunAt.x =
        s.stand.x +
        (pumping < 1 ? Math.sin(pumping * Math.PI * 2) * PUMP * s.side : 0) +
        kick * KICK * s.side;
      gunAt.y = s.stand.y;
      return gunAt;
    };

    const pumping = createBeats(
      shots.flatMap((s) => [
        s.arrives + (s.fires - s.arrives) * 0.25,
        s.arrives + (s.fires - s.arrives) * 0.75,
      ]),
      (ms) => ms,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const firing = createBeats(
      shots,
      (s) => s.fires,
      () => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(0.6);
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.hits,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.5);
        if (cover!.isLive())
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
        workers,
        tick: (ms, now) => {
          pumping.tick(ms, now);
          firing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, PELLET);
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              s.stand,
              s.angle,
              (ms - s.fires) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
