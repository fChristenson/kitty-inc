// ripples for events and crits: drops of light falling onto things and
// splashing, each throwing rings rippling out flat over what it hit, the
// drops quickening from a drizzle to a downpour. Time the drops with
// rainTimes, then each frame drawDrop before each lands and drawRipple +
// drawSplash after. drawDrop and drawSplash stamp in whatever composite is
// set ("lighter"), inside the caller's light batch
import { COLOR } from "../../../palette";
import { stampGlimmer } from "../../twinkle";
import type { Point } from "../../wisp";

// a ring lies flat: SQUASH as tall as it's wide; a second ring INNER of the
// first's size follows it
const SQUASH = 0.12;
const INNER = 0.6;
const INNER_SQUASH = 0.07;
export const RIPPLE_MS = 420;
// a drop falls with its streak STREAK of its fall behind it
const STREAK = 0.25;
// a splash: specks flung up both sides REACH times their size, falling back
const SPLASH_MS = 300;
const REACH = 4.5;
const RISE = 1.4;
const FALL = 2600;

// `count` drops from startMs, the gaps between them closing from gaps[0] to
// gaps[1] ms
export function rainTimes(
  count: number,
  startMs: number,
  gaps: [number, number],
): number[] {
  const times: number[] = [];
  let t = startMs;
  for (let n = 0; n < count; n++) {
    times.push(t);
    t += gaps[0] + (gaps[1] - gaps[0]) * (n / Math.max(1, count - 1));
  }
  return times;
}

// a drop `until` ms before it lands at `at`, falling `fall` px over fallMs,
// `size` px
export function drawDrop(
  ctx: CanvasRenderingContext2D,
  at: Point,
  until: number,
  fallMs: number,
  fall: number,
  size: number,
): void {
  if (until <= 0 || until > fallMs) return;
  const u = 1 - until / fallMs;
  const y = at.y - fall * (1 - u * u);
  stampGlimmer(
    ctx,
    at.x,
    y - fall * STREAK * u,
    size * 0.5,
    2,
    COLOR.heavenlyGold,
  );
  stampGlimmer(ctx, at.x, y, size, 3, COLOR.white);
}

// the rings rippling out from `at` `since` ms after the drop landed, out to
// `radius`, `width` px thick at first; `rings` 1 or 2
export function drawRipple(
  ctx: CanvasRenderingContext2D,
  at: Point,
  since: number,
  radius: number,
  width: number,
  rings = 1,
  lifeMs = RIPPLE_MS,
): void {
  if (since < 0 || since >= lifeMs) return;
  const u = since / lifeMs;
  const r = radius * (1 - (1 - u) ** 2);
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * (1 - u);
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, r, r * SQUASH, 0, 0, Math.PI * 2);
  if (rings > 1) {
    ctx.moveTo(at.x + r * INNER, at.y);
    ctx.ellipse(at.x, at.y, r * INNER, r * INNER_SQUASH, 0, 0, Math.PI * 2);
  }
  ctx.lineWidth = width * (1 - u);
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
  ctx.lineWidth = width * 0.4 * (1 - u);
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
  ctx.globalAlpha = alpha;
}

// a crown of `count` specks splashing up both sides of `at`, `size` px
export function drawSplash(
  ctx: CanvasRenderingContext2D,
  at: Point,
  since: number,
  size: number,
  count = 7,
  lifeMs = SPLASH_MS,
): void {
  if (since < 0 || since >= lifeMs) return;
  const s = since / lifeMs;
  const t = since / 1000;
  for (let i = 0; i < count; i++) {
    const a = Math.PI + (i / Math.max(1, count - 1)) * Math.PI;
    const d = size * REACH * s;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * d,
      at.y + Math.sin(a) * d * RISE + 0.5 * FALL * t * t,
      size * (1 - s),
      i,
      COLOR.heavenlyGold,
    );
  }
}
