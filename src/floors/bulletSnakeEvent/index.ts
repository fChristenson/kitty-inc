// the "Bullet Snake" event (gunfire; a free floor): it covers its crit,
// whose click freezes the screen while a gun wisp at the clicked floor's
// button opens up on the building's locked floor, a stream of bullets
// weaving up the screen in a slithering snake, every round slamming into
// the lock with a flash, a pop and a jolt, the stream ever faster and the
// snake ever wilder, until a last huge round blows the lock in a huge blast
// and shake and the floor bursts open, unlocked for free, as the screen
// unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { drawMuzzleFlash } from "../../shared/bullets";
import { createBeats } from "../../shared/eventBeats";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "bulletSnake";
const SHOTS = 22;
// the snake weaves WAVES times, swinging up to SWAY px
const WAVES = 2.5;
const SWAY: [number, number] = [60, 160];
const FLASH_MS = 70;
const GUN = 0.5;
const ROUND = 0.28;
const BIG_ROUND = 0.9;
const BANG_GAP_MS = 60;

export const forceBulletSnakeEvent = registerWispEvent(
  KEY,
  "Bullet Snake",
  () => CONFIG.bulletSnakeEvent.chance,
  (floor, context) => {
    const { fireMs, flightMs, holdMs, mergeMs } = CONFIG.bulletSnakeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const dx = lock.x - button.x;
    const dy = lock.y - button.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d;
    const ny = dx / d;
    const angle = Math.atan2(dy, dx);
    const rounds = Array.from({ length: SHOTS + 1 }, (_, i) => {
      const big = i === SHOTS;
      const fires = big ? fireMs + 120 : fireMs * Math.sqrt(i / SHOTS);
      // later rounds swing wider: the snake gets wilder
      const sway = lerp(SWAY, i / SHOTS) * (big ? 0.3 : 1);
      const phase = (fires / 1000) * Math.PI * 4;
      const at: Point = { x: 0, y: 0 };
      return {
        fires,
        hits: fires + flightMs,
        big,
        at: (ms: number): Point => {
          const u = clamp01((ms - fires) / flightMs);
          // every round rides the snake's body, which slithers sideways
          const s =
            Math.sin(u * Math.PI * 2 * WAVES - phase) *
            sway *
            Math.sin(u * Math.PI);
          at.x = lerp([button.x, lock.x], u) + nx * s;
          at.y = lerp([button.y, lock.y], u) + ny * s;
          return at;
        },
      };
    });
    const last = rounds[SHOTS];
    const endAt = last.hits;
    const gunAt = (): Point => button;
    let lastBang = -Infinity;

    const hitting = createBeats(
      rounds,
      (r) => r.hits,
      (r, k) => {
        if (r.big) {
          cover!.blast(lock);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(lock, 0.3);
        if (!cover!.isLive() || r.hits - lastBang < BANG_GAP_MS) return;
        lastBang = r.hits;
        playBloop();
        shakeScreen(lerp([0.3, 1], k / SHOTS));
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
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const r of rounds) {
            if (ms < r.fires || ms >= r.hits) continue;
            if (r.big)
              drawWispBetween(
                ctx,
                r.at,
                ms,
                now,
                WISP_SIZE * BIG_ROUND,
                1,
                r.fires,
                r.hits,
              );
            else drawWispHead(ctx, r.at, ms, now, WISP_SIZE * ROUND, 1);
            const t = (ms - r.fires) / FLASH_MS;
            if (t < 1) drawMuzzleFlash(ctx, button, angle, t, r.big ? 110 : 46);
          }
          drawWispBetween(
            ctx,
            gunAt,
            ms,
            now,
            WISP_SIZE * GUN,
            0.6,
            0,
            last.fires,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
