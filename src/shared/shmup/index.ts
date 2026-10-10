// a bullet hell seen from straight above, for the Shmup look's events: deep
// space with its stars streaming down past the view, the ship (a gray delta
// seen from above) with its exhausts flaming, enemies (wisps) flying in and
// swaying until they're shot down, and the ship's twin guns planned at the
// next enemy to fall. Bullets are shared/bullets', blasts shared/explosion's;
// plan everything once the view is known, then draw it by ms
import { COLOR } from "../../palette";
import { aimBullet, fireBullet, type Box, type Bullet } from "../bullets";
import { clamp01, easeOut, easeOutCubic, lerp } from "../easing";
import { hash01, stampGlimmer } from "../twinkle";
import { drawWisp, type Point } from "../wisp";
import { beginLightBatch, endLightBatch } from "../lightBatch";

// the screen the game is played on, in the canvas's space
export interface ShmupBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// space's stars in layers, far to near: each layer's speed (of the box's
// height a second), size (px) and colour
const STARS = 40;
const STAR_LAYERS: { speed: number; size: number; color: string }[] = [
  { speed: 0.12, size: 3, color: COLOR.white },
  { speed: 0.35, size: 5, color: COLOR.white },
  { speed: 0.9, size: 8, color: COLOR.heavenlyGold },
];

// deep space over the box with its stars streaming down past the view, the
// nearer faster, bigger and gold
export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  box: ShmupBox,
  ms: number,
  now: number,
): void {
  ctx.fillStyle = COLOR.skySpace;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let l = 0; l < STAR_LAYERS.length; l++) {
    const { speed, size, color } = STAR_LAYERS[l];
    for (let i = 0; i < STARS; i++) {
      const seed = l * STARS + i;
      const y = (hash01(seed, 2) + (ms / 1000) * speed) % 1;
      stampGlimmer(
        ctx,
        box.x + hash01(seed, 1) * box.w,
        box.y + (y < 0 ? y + 1 : y) * box.h,
        size * (0.5 + 0.5 * hash01(seed, 3)),
        now * 0.001 + seed,
        color,
      );
    }
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

export interface ShmupShipLook {
  wing: string;
  shadow: string;
}

export const SHMUP_SHIP: ShmupShipLook = {
  wing: COLOR.silverTicketGray,
  shadow: COLOR.black,
};

// the ship's outline, nose up, in units of its half span: nose, right tip,
// tail notch, left tip
const OUTLINE: [number, number][] = [
  [0, -1.3],
  [1, 0.7],
  [0, 0.4],
  [-1, 0.7],
];
// its shadow below it, down and right, in half spans
const SHADOW_AT: [number, number] = [0.35, 0.6];
const SHADOW = 0.25;
// its right slope shaded, more as it banks that way
const SHADE = 0.25;
// how much a bank narrows it, and where its side exhausts sit along the tail
const BANK_NARROW = 0.25;
const EXHAUST_OUT = 0.45;

// the ship at `at`, nose up, `size` px its half span, banking -1..1 (right
// for positive); returns its exhausts on the tail
export function drawShmupShip(
  ctx: CanvasRenderingContext2D,
  look: ShmupShipLook,
  at: Point,
  size: number,
  bank = 0,
): Point[] {
  const sx = size * (1 - BANK_NARROW * Math.abs(bank));
  const px = (i: number, dx = 0) => at.x + OUTLINE[i][0] * sx + dx;
  const py = (i: number, dy = 0) => at.y + OUTLINE[i][1] * size + dy;
  const half = (side: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(px(0, dx), py(0, dy));
    ctx.lineTo(px(side, dx), py(side, dy));
    ctx.lineTo(px(2, dx), py(2, dy));
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = look.shadow;
  ctx.globalAlpha = SHADOW;
  half(1, SHADOW_AT[0] * size, SHADOW_AT[1] * size);
  half(3, SHADOW_AT[0] * size, SHADOW_AT[1] * size);
  ctx.globalAlpha = 1;
  ctx.fillStyle = look.wing;
  half(1, 0, 0);
  half(3, 0, 0);
  ctx.fillStyle = look.shadow;
  ctx.globalAlpha = SHADE * (1 + Math.max(0, bank));
  half(1, 0, 0);
  ctx.globalAlpha = SHADE * Math.max(0, -bank);
  half(3, 0, 0);
  ctx.globalAlpha = 1;
  const exhausts: Point[] = [];
  for (const side of [3, 2, 1]) {
    const t = side === 2 ? 0 : EXHAUST_OUT;
    exhausts.push({
      x: px(2) + (px(side) - px(2)) * t,
      y: py(2) + (py(side) - py(2)) * t,
    });
  }
  return exhausts;
}

const flame: Point = { x: 0, y: 0 };

// a flame wisp `size` big out of each exhaust, its trail streaming back down
// the screen at `trail` px a ms
export function drawShipFlames(
  ctx: CanvasRenderingContext2D,
  exhausts: readonly Point[],
  ms: number,
  now: number,
  size: number,
  trail: number,
): void {
  for (const e of exhausts)
    drawWisp(
      ctx,
      (t) => {
        flame.x = e.x;
        flame.y = e.y + (ms - t) * trail;
        return flame;
      },
      ms,
      now,
      size,
      1,
    );
}

export interface ShmupEnemy {
  // null before it flies in and once it's shot down
  at: (ms: number) => Point | null;
  size: number;
  enterAt: number;
  killAt: number;
}

export interface ShmupEnemyPlan {
  // shares of the box: where it flies in from, and where it settles
  from: [number, number];
  to: [number, number];
  enterAt: number;
  inMs: number;
  killAt: number;
  // its wisp's size
  size: number;
  // how far it sways once settled, of the box's width
  sway?: number;
  seed?: number;
}

// an enemy flying in from `from` to `to` over inMs, then swaying until it's
// shot down at killAt
export function shmupEnemy(
  box: ShmupBox,
  { from, to, enterAt, inMs, killAt, size, sway = 0, seed = 0 }: ShmupEnemyPlan,
): ShmupEnemy {
  const spot: Point = { x: 0, y: 0 };
  return {
    size,
    enterAt,
    killAt,
    at: (ms) => {
      if (ms < enterAt || ms >= killAt) return null;
      const t = clamp01((ms - enterAt) / inMs);
      const settled = ms - enterAt - inMs;
      const drift = settled > 0 ? sway * Math.sin(settled * 0.004 + seed) : 0;
      spot.x =
        box.x + box.w * (lerp([from[0], to[0]], easeOutCubic(t)) + drift);
      spot.y = box.y + box.h * lerp([from[1], to[1]], easeOut(t));
      return spot;
    },
  };
}

// a copy of where enemy is at ms, held to its time on screen
export function enemySpot(enemy: ShmupEnemy, ms: number): Point {
  const at = enemy.at(Math.max(enemy.enterAt, Math.min(ms, enemy.killAt - 1)));
  return at ? { x: at.x, y: at.y } : { x: 0, y: 0 };
}

export interface ShipShot {
  bullet: Bullet;
  // the enemy it's aimed at, or -1 for straight up
  target: number;
}

export interface ShipGuns {
  // when they fire, and every how many ms
  fromMs: number;
  toMs: number;
  every: number;
  // px a ms
  speed: number;
  // the twin muzzles' gap either side of the nose, px
  twin: number;
  // how far ahead of the ship's middle the nose is, px
  nose: number;
  // ms ahead of a shot to aim at its target
  lead: number;
}

// the ship's twin guns firing at the enemy due to fall next that's been on
// screen a moment, or straight up when there's none; `ship(ms)` returns a
// fresh point
export function planShipGuns(
  ship: (ms: number) => Point,
  enemies: readonly ShmupEnemy[],
  guns: ShipGuns,
  box: Box,
): ShipShot[] {
  const shots: ShipShot[] = [];
  for (let ms = guns.fromMs; ms < guns.toMs; ms += guns.every) {
    let target = -1;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (ms < e.enterAt + 300 || ms >= e.killAt) continue;
      if (target < 0 || e.killAt < enemies[target].killAt) target = i;
    }
    const nose = ship(ms);
    for (const side of [-1, 1]) {
      const muzzle = { x: nose.x + side * guns.twin, y: nose.y - guns.nose };
      shots.push({
        target,
        bullet:
          target >= 0
            ? aimBullet(
                muzzle,
                enemySpot(enemies[target], ms + guns.lead),
                ms,
                guns.speed,
              )
            : fireBullet(muzzle, -Math.PI / 2, ms, guns.speed, box),
      });
    }
  }
  return shots;
}

// each enemy's heat 0..1 into `heat`: 1 while a shot is landing on it
export function shotHeat(
  shots: readonly ShipShot[],
  ms: number,
  heat: number[],
  hitMs = 90,
): void {
  heat.fill(0);
  for (const { bullet, target } of shots)
    if (target >= 0 && ms >= bullet.hitAt && ms < bullet.hitAt + hitMs)
      heat[target] = 1;
}
