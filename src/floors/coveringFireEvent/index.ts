// the "Covering Fire" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while gun wisps at both edges of the screen lay
// down streams of suppressing fire across it, bullets streaking side to
// side behind rattling muzzle flashes, and recruit wisps dash out of the
// clicked floor's button for every empty spot, darting cover to cover in
// zigzags through the crossfire; each one reaching its spot is a flash, a
// pop and a jolt as a new worker forms there, the last arrival landing in
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp, smoothstep } from "../../shared/easing";
import {
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Box,
  type Bullet,
} from "../../shared/bullets";
import { createBeats } from "../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "coveringFire";
const MAX_HIRES = 5;
const FORM_MS = 300;
const LIFT = 30;
// gun rows down each edge, as shares of the screen's height
const ROWS = [0.35, 0.7];
const INSET = 30;
const RATE_MS = 75;
const SPEED = 3.2;
const JITTER = 0.06;
const FLASH_MS = 60;
// each dash darts LEGS legs, swinging ZIG px either side of the straight line
const LEGS = 3;
const ZIG = 120;
const GUN = 0.45;
const BULLET = WISP_SIZE * 0.26;
const RECRUIT = 0.42;
const ARRIVE_SHAKE: [number, number] = [0.6, 1.2];

export const forceCoveringFireEvent = registerWispEvent(
  KEY,
  "Covering Fire",
  () => CONFIG.coveringFireEvent.chance,
  (floor, context, area) => {
    const { gapMs, dashMs, holdMs, mergeMs } = CONFIG.coveringFireEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const height = area.bottom - area.top;
    let clock = 0;
    const dashes = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const leaves = clock;
      const arrives = leaves + dashMs;
      clock += lerp(gapMs, k / Math.max(1, hires.length - 1));
      const dx = spot.x - button.x;
      const dy = spot.y - button.y;
      const d = Math.hypot(dx, dy) || 1;
      // the covers it darts between, zigzagging across the line
      const stops: Point[] = Array.from({ length: LEGS + 1 }, (_, j) => {
        const u = j / LEGS;
        const zig = j === 0 || j === LEGS ? 0 : (j % 2 === 0 ? 1 : -1) * ZIG;
        return {
          x: lerp([button.x, spot.x], u) - (dy / d) * zig * (k % 2 ? -1 : 1),
          y: lerp([button.y, spot.y], u) + (dx / d) * zig * (k % 2 ? -1 : 1),
        };
      });
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        leaves,
        arrives,
        at: (ms: number): Point => {
          const f = Math.min(
            LEGS,
            Math.max(0, ((ms - leaves) / dashMs) * LEGS),
          );
          const leg = Math.min(LEGS - 1, Math.floor(f));
          // a sprint then a duck into cover on every leg
          const t = smoothstep(f - leg);
          at.x = lerp([stops[leg].x, stops[leg + 1].x], t);
          at.y = lerp([stops[leg].y, stops[leg + 1].y], t);
          return at;
        },
      };
    });
    const last = dashes.reduce((a, b) => (b.arrives > a.arrives ? b : a));
    const endAt = last.arrives;
    const box: Box = {
      left: area.left,
      right: area.right,
      top: area.top,
      bottom: area.bottom,
    };
    const guns = ROWS.flatMap((row, r) =>
      [-1, 1].map((side) => {
        const at: Point = {
          x: side < 0 ? area.left + INSET : area.right - INSET,
          y: area.top + height * row,
        };
        const angle = side < 0 ? 0 : Math.PI;
        // the two sides rattle out of step
        const offset = ((r + (side < 0 ? 0 : 0.5)) / ROWS.length) * RATE_MS;
        const bullets: Bullet[] = [];
        for (let ms = offset; ms < endAt; ms += RATE_MS)
          bullets.push(
            fireBullet(
              at,
              angle + Math.sin(ms * 0.05 + r) * JITTER,
              ms,
              SPEED,
              box,
            ),
          );
        return { at, angle, offset, bullets, place: (): Point => at };
      }),
    );
    const bullets = guns.flatMap((g) => g.bullets);

    const arriving = createBeats(
      dashes,
      (d) => d.arrives,
      (d, k) => {
        giveHire(d.hire);
        if (d === last) {
          cover!.blast(d.spot);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(d.spot, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(ARRIVE_SHAKE, k / Math.max(1, dashes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => arriving.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_000) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const d of dashes)
            drawWispBetween(
              ctx,
              d.at,
              ms,
              now,
              WISP_SIZE * RECRUIT,
              0.7,
              d.leaves,
              d.arrives,
            );
          if (ms > endAt) return;
          for (const g of guns) {
            const since = (ms - g.offset) % RATE_MS;
            if (ms >= g.offset)
              drawMuzzleFlash(ctx, g.at, g.angle, since / FLASH_MS, 60);
            drawWispBetween(
              ctx,
              g.place,
              ms,
              now,
              WISP_SIZE * GUN,
              0.6,
              0,
              endAt,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
