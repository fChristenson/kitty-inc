// the "Homing Rounds" event (gunfire; worker perma tiers): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// fires volley after volley of wisp bullets fanned wide up into the sky
// with a muzzle flash and a rattle; each round flies out, then curls round
// in a long arc and homes in on a worker, every hit a pop, the last round
// of each volley landing with a flash and a jolt as the worker climbs a
// perma tier; the volleys come ever faster, the last one ending in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import {
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "homingRounds";
const MAX_WORKERS = 6;
const ROUNDS = 5;
const SHOT_GAP_MS = 45;
const FAN = 1.6;
const REACH = 360;
const FLASH_MS = 90;
const FLASH = 50;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

// a round flying from `from`, swung out through `bend`, onto `to`
function homingRound(
  from: Point,
  bend: Point,
  to: Point,
  firedAt: number,
  hitAt: number,
): Bullet {
  const spot: Point = { x: 0, y: 0 };
  const dx = bend.x - from.x;
  const dy = bend.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    from,
    dx: dx / length,
    dy: dy / length,
    speed: length / (hitAt - firedAt),
    firedAt,
    hitAt,
    to,
    at: (ms) => {
      if (ms < firedAt || ms >= hitAt) return null;
      return bezier(from, bend, to, (ms - firedAt) / (hitAt - firedAt), spot);
    },
  };
}

export const forceHomingRoundsEvent = registerWispEvent(
  KEY,
  "Homing Rounds",
  () => CONFIG.homingRoundsEvent.chance,
  (floor, context) => {
    const { volleysMs, flightMs, holdMs, mergeMs } = CONFIG.homingRoundsEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const gun = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const volleys = workers.map((worker, k) => {
      const fires = clock;
      clock += lerp(volleysMs, k / Math.max(1, workers.length - 1));
      const rounds = Array.from({ length: ROUNDS }, (_, r) => {
        const angle = -Math.PI / 2 + FAN * (r / (ROUNDS - 1) - 0.5);
        const bend = {
          x: gun.x + Math.cos(angle) * REACH,
          y: gun.y + Math.sin(angle) * REACH,
        };
        const firedAt = fires + r * SHOT_GAP_MS;
        return {
          angle,
          bullet: homingRound(
            gun,
            bend,
            worker.at,
            firedAt,
            firedAt + flightMs,
          ),
        };
      });
      return { worker, rounds, lands: rounds[ROUNDS - 1].bullet.hitAt };
    });
    const last = volleys[volleys.length - 1];
    const endAt = last.lands;
    const bullets = volleys.flatMap((v) => v.rounds.map((r) => r.bullet));
    const shots = volleys.flatMap((v) => v.rounds);
    const finals = new Set(volleys.map((v) => v.rounds[ROUNDS - 1].bullet));

    const popping = createBeats(
      bullets.filter((b) => !finals.has(b)),
      (b) => b.hitAt,
      (b) => {
        cover!.burst(b.to, 0.25);
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      volleys,
      (v) => v.lands,
      (v, k) => {
        cover!.promote(v.worker as RewardWorker);
        if (v === last) {
          cover!.blast(v.worker.at);
          return;
        }
        cover!.burst(v.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, volleys.length - 1)));
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
          popping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
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
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
