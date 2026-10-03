// bullets for events: wisps fired as projectiles, flying dead straight, each
// planned at arm time with when it lands, in bullet-hell patterns (rings,
// fans, whirling spirals) or aimed shots, plus the flash at a gun's muzzle
import { COLOR } from "../../palette";
import { drawGlow, fadeStops } from "../glowSprite";
import { lerp, type Range } from "../easing";
import { drawWispBetween, drawWispHead, WISP_SIZE, type Point } from "../wisp";

export interface Bullet {
  from: Point;
  dx: number;
  dy: number;
  // px per ms
  speed: number;
  firedAt: number;
  hitAt: number;
  to: Point;
  // its spot at ms; null before it's fired or once it lands
  at: (ms: number) => Point | null;
}

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const FLASH = fadeStops(COLOR.heavenlyGold);
const FLASH_CORE = fadeStops(COLOR.white, 0.3);
const FLASH_SQUASH = 0.4;

function bullet(
  from: Point,
  dx: number,
  dy: number,
  speed: number,
  firedAt: number,
  reach: number,
): Bullet {
  const spot: Point = { x: 0, y: 0 };
  const hitAt = firedAt + Math.max(0, reach) / speed;
  return {
    from,
    dx,
    dy,
    speed,
    firedAt,
    hitAt,
    to: { x: from.x + dx * reach, y: from.y + dy * reach },
    at: (ms) => {
      if (ms < firedAt || ms >= hitAt) return null;
      const d = (ms - firedAt) * speed;
      spot.x = from.x + dx * d;
      spot.y = from.y + dy * d;
      return spot;
    },
  };
}

// fired from `from` at `angle`, landing where it reaches the box's edge
export function fireBullet(
  from: Point,
  angle: number,
  firedAt: number,
  speed: number,
  box: Box,
): Bullet {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const reach = Math.min(
    dx > 0
      ? (box.right - from.x) / dx
      : dx < 0
        ? (box.left - from.x) / dx
        : Infinity,
    dy > 0
      ? (box.bottom - from.y) / dy
      : dy < 0
        ? (box.top - from.y) / dy
        : Infinity,
  );
  return bullet(from, dx, dy, speed, firedAt, reach);
}

// fired from `from` straight at `to`, landing on it
export function aimBullet(
  from: Point,
  to: Point,
  firedAt: number,
  speed: number,
): Bullet {
  const reach = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return bullet(
    from,
    (to.x - from.x) / reach,
    (to.y - from.y) / reach,
    speed,
    firedAt,
    reach,
  );
}

// `count` shots every way at once, the first at `turn`
export function bulletRing(
  from: Point,
  count: number,
  firedAt: number,
  speed: number,
  box: Box,
  turn = 0,
): Bullet[] {
  return Array.from({ length: count }, (_, i) =>
    fireBullet(from, turn + (i / count) * Math.PI * 2, firedAt, speed, box),
  );
}

// `count` shots fanned `spread` rad wide round `angle`
export function bulletFan(
  from: Point,
  angle: number,
  spread: number,
  count: number,
  firedAt: number,
  speed: number,
  box: Box,
): Bullet[] {
  return Array.from({ length: count }, (_, i) =>
    fireBullet(
      from,
      angle + spread * (count > 1 ? i / (count - 1) - 0.5 : 0),
      firedAt,
      speed,
      box,
    ),
  );
}

export interface Spiral {
  arms: number;
  // shots a second per arm and laps a second, each ramping over the burst
  rateHz: Range;
  lapsHz: Range;
  fromMs: number;
  toMs: number;
  // the first arm's angle, and 1 or -1 for which way it whirls
  turn: number;
  spin: number;
}

// whirling spiral arms firing from `from` like a bullet-hell boss
export function bulletSpiral(
  from: Point,
  spiral: Spiral,
  speed: number,
  box: Box,
): Bullet[] {
  const { arms, rateHz, lapsHz, fromMs, toMs, turn, spin } = spiral;
  const span = toMs - fromMs;
  const angle = (ms: number) => {
    const s = (ms - fromMs) / 1000;
    return (
      turn +
      spin *
        Math.PI *
        2 *
        (lapsHz[0] * s +
          ((lapsHz[1] - lapsHz[0]) * s * s) / (2 * (span / 1000)))
    );
  };
  const shots: Bullet[] = [];
  let due = 0;
  for (let ms = fromMs; ms < toMs; ms++) {
    due += lerp(rateHz, (ms - fromMs) / span) / 1000;
    while (due >= 1) {
      due--;
      for (let a = 0; a < arms; a++)
        shots.push(
          fireBullet(
            from,
            angle(ms) + (a / arms) * Math.PI * 2,
            ms,
            speed,
            box,
          ),
        );
    }
  }
  return shots;
}

// every bullet in flight at ms, `size` big: heads only (cheap for a hail of
// them), or with their tracer trails for a few
export function drawBullets(
  ctx: CanvasRenderingContext2D,
  bullets: readonly Bullet[],
  ms: number,
  now: number,
  size = WISP_SIZE * 0.45,
  trails = false,
): void {
  for (const b of bullets) {
    if (trails)
      drawWispBetween(ctx, b.at, ms, now, size, 1, b.firedAt, b.hitAt);
    else if (ms >= b.firedAt && ms < b.hitAt)
      drawWispHead(ctx, b.at, ms, now, size);
  }
}

// the flash at a muzzle firing along `angle`, t 0..1 through it
export function drawMuzzleFlash(
  ctx: CanvasRenderingContext2D,
  at: Point,
  angle: number,
  t: number,
  size: number,
): void {
  if (t <= 0 || t >= 1) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 1 - t;
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  drawGlow(ctx, FLASH, size * 0.6, 0, size * (1 - 0.4 * t), FLASH_SQUASH);
  drawGlow(ctx, FLASH_CORE, 0, 0, size * 0.45);
  ctx.restore();
}
