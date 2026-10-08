// the "Bullet Wheel" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a wheel of six gun wisps rolls across the middle
// of the screen, spinning faster and faster and firing volley after volley
// of bullets straight out from its rim, rattling ever quicker; every bullet
// that hits the screen's edge pops into coins, the walls jolting; at the far
// side the guns fold into the hub, which fires one great bullet into the
// total in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
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
  fireBullet,
  type Bullet,
} from "../../../../shared/bullets";
import { ringTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "bulletWheel";
const REWARD = 4;
const GUNS = 6;
const WHEEL_R = 90;
const SPINS = 3;
const EDGE = 150;
const BOX = 14;
const GAPS: [number, number] = [150, 55];
const SPEED = 2.2;
const FOLD_MS = 160;
const SHOT_SPEED = 3;
const FLASH_MS = 80;
const MUZZLE = 34;
const COINS = 3;
const COIN_REACH: [number, number] = [20, 70];
const GUN = 0.38;
const HUB = 0.55;
const BULLET = 0.22;
const BIG_BULLET = 0.7;
const POP_GAP_MS = 45;

export const forceBulletWheelEvent = registerWispEvent(
  KEY,
  "Bullet Wheel",
  () => CONFIG.bulletWheelEvent.chance,
  (floor, context, area) => {
    const { spinMs, holdMs, mergeMs } = CONFIG.bulletWheelEvent;
    const total = totalSpot(area);
    const box = {
      left: area.left + BOX,
      right: area.right - BOX,
      top: area.top + BOX,
      bottom: area.bottom - BOX,
    };
    const y = (area.top + area.bottom) / 2 + 80;
    const hubAt = (ms: number, into: Point): Point => {
      into.x = lerp(
        [area.left + EDGE, area.right - EDGE],
        clamp01(ms / spinMs),
      );
      into.y = y;
      return into;
    };
    const turnAt = (ms: number) =>
      Math.PI * 2 * SPINS * clamp01(ms / spinMs) ** 2;
    const bullets: Bullet[] = [];
    for (let t = 0; t < spinMs; t += lerp(GAPS, t / spinMs)) {
      const hub = hubAt(t, { x: 0, y: 0 });
      for (let i = 0; i < GUNS; i++) {
        const a = turnAt(t) + (i / GUNS) * Math.PI * 2;
        bullets.push(
          fireBullet(
            {
              x: hub.x + Math.cos(a) * WHEEL_R,
              y: hub.y + Math.sin(a) * WHEEL_R,
            },
            a,
            t,
            SPEED,
            box,
          ),
        );
      }
    }
    const end = hubAt(spinMs, { x: 0, y: 0 });
    const big = aimBullet(end, total, spinMs + FOLD_MS, SHOT_SPEED);
    const endAt = big.hitAt;
    let lastPop = -Infinity;

    const popping = createBeats(
      bullets,
      (b) => b.hitAt,
      (b, k) => {
        cover!.launchFrom(b.to, ringTargets(b.to, COINS, COIN_REACH));
        if (!cover!.isLive() || b.hitAt - lastPop < POP_GAP_MS) return;
        lastPop = b.hitAt;
        playBloop();
        if (k % 3 === 0) shakeScreen(0.3 + 0.5 * (b.firedAt / spinMs));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const hubPoint: Point = { x: 0, y: 0 };
    const hub = (ms: number): Point => hubAt(Math.max(0, ms), hubPoint);
    const guns = Array.from({ length: GUNS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const t = Math.max(0, ms);
        hubAt(t, at);
        const a = turnAt(t) + (i / GUNS) * Math.PI * 2;
        const r = WHEEL_R * (1 - easeIn(clamp01((t - spinMs) / FOLD_MS)));
        at.x += Math.cos(a) * r;
        at.y += Math.sin(a) * r;
        return at;
      };
    });
    const bigOnly = [big];

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * BULLET);
          drawBullets(ctx, bigOnly, ms, now, WISP_SIZE * BIG_BULLET, true);
          for (const b of bullets) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, b.from, Math.atan2(b.dy, b.dx), t, MUZZLE);
          }
          const foldEnd = spinMs + FOLD_MS;
          for (const g of guns)
            drawWispBetween(ctx, g, ms, now, WISP_SIZE * GUN, 0.5, 0, foldEnd);
          drawWispBetween(
            ctx,
            hub,
            ms,
            now,
            WISP_SIZE * HUB,
            ms / foldEnd,
            0,
            foldEnd,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
