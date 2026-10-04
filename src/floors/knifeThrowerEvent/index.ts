// the "Knife Thrower" event (gunfire; worker perma tiers): it covers its
// crit, whose click freezes the screen while a gun wisp takes aim at a
// worker from the side and, like a knife thrower's act, rattles off shot
// after shot that thud in all round the worker's outline, each with a
// muzzle flash and a pop, closer together and quicker; with the outline
// closed every round in it flares and the worker lights up a perma tier
// with a jolt, then the gun swings to the next worker, quicker each time,
// the last outline going off in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "knifeThrower";
const MAX_WORKERS = 3;
const SHOTS = 10;
// the outline round a worker, centred a little above its feet spot
const RX = 62;
const RY = 100;
const RAISE = 10;
const RANGE = 380;
const FLIGHT_MS = 110;
const GLIDE_MS = 140;
const FLASH_MS = 80;
const OUTLINE_MS = 220;
const GUN = 0.5;
const BULLET = WISP_SIZE * 0.32;
const STUCK = 10;
const POP_GAP_MS = 45;
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);
const SHOT_SHAKE = 0.18;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Act {
  worker: RewardWorker;
  gun: Point;
  shots: Bullet[];
  closes: number;
}

export const forceKnifeThrowerEvent = registerWispEvent(
  KEY,
  "Knife Thrower",
  () => CONFIG.knifeThrowerEvent.chance,
  (floor, context, area) => {
    const { shotsMs, holdMs, mergeMs } = CONFIG.knifeThrowerEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = GLIDE_MS;
    const acts: Act[] = workers.map((worker, k) => {
      const { x, y } = worker.at;
      // from whichever side has more room
      const side = x - area.left > area.right - x ? -1 : 1;
      const gun: Point = {
        x: Math.max(
          area.left + 40,
          Math.min(area.right - 40, x + side * RANGE),
        ),
        y: y - RAISE,
      };
      const gap = lerp(shotsMs, k / Math.max(1, workers.length - 1));
      let fires = clock;
      const shots = Array.from({ length: SHOTS }, (_, i) => {
        // round the outline from the top of the head, rattling ever faster
        const a = -Math.PI / 2 + (i / SHOTS) * Math.PI * 2;
        const to: Point = {
          x: x + Math.cos(a) * RX,
          y: y - RAISE + Math.sin(a) * RY,
        };
        const reach = Math.hypot(to.x - gun.x, to.y - gun.y);
        const shot = aimBullet(gun, to, fires, reach / FLIGHT_MS);
        fires += gap * lerp([1.3, 0.6], i / (SHOTS - 1));
        return shot;
      });
      const closes = shots[SHOTS - 1].hitAt;
      clock = closes + GLIDE_MS;
      return { worker, gun, shots, closes };
    });
    const last = acts[acts.length - 1];
    const endAt = last.closes + OUTLINE_MS;
    const bullets = acts.flatMap((a) => a.shots);
    const spot: Point = { x: 0, y: 0 };
    const start: Point = { x: acts[0].gun.x, y: area.bottom + 40 };
    // gliding in, then from act to act
    const gunAt = (ms: number): Point => {
      let from = start;
      let leaves = 0;
      for (const a of acts) {
        const arrives = a.shots[0].firedAt;
        if (ms < arrives) {
          const u = smoothstep(clamp01((ms - leaves) / (arrives - leaves)));
          spot.x = lerp([from.x, a.gun.x], u);
          spot.y = lerp([from.y, a.gun.y], u);
          return spot;
        }
        if (ms < a.closes) return a.gun;
        from = a.gun;
        leaves = a.closes;
      }
      return last.gun;
    };

    let pop = -Infinity;
    const hitting = createBeats(
      bullets,
      (b) => b.hitAt,
      (b, i) => {
        if (!cover!.isLive() || i % SHOTS === SHOTS - 1) return;
        if (i % 2 === 0) shakeScreen(SHOT_SHAKE);
        if (b.hitAt - pop < POP_GAP_MS) return;
        pop = b.hitAt;
        playBloop();
      },
    );
    const closing = createBeats(
      acts,
      (a) => a.closes,
      (a, k) => {
        cover!.promote(a.worker);
        if (a === last) {
          cover!.blast(a.worker.at);
          return;
        }
        cover!.burst(a.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, acts.length - 1)));
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
          hitting.tick(ms, now);
          closing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const prev = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          for (const a of acts) {
            if (ms < a.shots[0].hitAt || ms > a.closes + OUTLINE_MS) continue;
            // stuck rounds, flaring as the outline closes
            const flare = clamp01((ms - a.closes) / OUTLINE_MS);
            ctx.globalAlpha = 1 - flare;
            for (const b of a.shots) {
              if (ms < b.hitAt) break;
              const fresh = 1 - clamp01((ms - b.hitAt) / FLASH_MS);
              const r = STUCK * (1 + fresh + 2 * Math.sin(Math.PI * flare));
              drawGlow(ctx, GOLD, b.to.x, b.to.y, r * 1.8);
              drawGlow(ctx, WHITE, b.to.x, b.to.y, r * 0.6);
            }
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = prev;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const b of bullets) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t < 0 || t >= 1) continue;
            drawMuzzleFlash(ctx, b.from, Math.atan2(b.dy, b.dx), t, 50);
          }
          drawWispBetween(
            ctx,
            gunAt,
            ms,
            now,
            WISP_SIZE * GUN,
            0.8,
            0,
            last.closes,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
