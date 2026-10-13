// slicing for events and crits: swift slash streaks cutting things (bars, a
// cover, coins, the frozen screen) in two, the pieces sliding apart along
// each cut as glitter spills out of it. Plan each cut once (planSlash), then
// each frame drawSlash and drawSliceSpill for it, and move every piece by
// sliceOffset from its middle
import { COLOR } from "../../../palette";
import { drawBeam, drawBeamFlare } from "../beam";
import { clamp01 } from "../../easing";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { hash01, stampGlimmer } from "../../twinkle";
import type { Point } from "../../wisp";

// a slash swipes along its line, its tip flaring, then fades
export const SLASH_MS = 70;
const FADE_MS = 160;
const TIP_FLARE = 0.8;
// the cut's glitter: falling out of it for SPILL_MS, scattered SPILL_SCATTER
// of its size either side, dropping SPILL_FALL px by the end
const SPILL_MS = 500;
const SPILL_SCATTER = 1.3;
const SPILL_FALL = 160;
// the pieces sliding apart over APART_MS once a cut is through
const APART_MS = 80;

export interface Slash {
  from: Point;
  to: Point;
  startMs: number;
  // when it's through
  endMs: number;
  // the unit normal to the cut: the pieces on its side move along it
  n: Point;
}

// a cut from `from` to `to`, swiping from startMs over swipeMs
export function planSlash(
  from: Point,
  to: Point,
  startMs: number,
  swipeMs = SLASH_MS,
): Slash {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    from,
    to,
    startMs,
    endMs: startMs + swipeMs,
    n: { x: -dy / length, y: dx / length },
  };
}

const tip: Point = { x: 0, y: 0 };

// the slash `width` px across: a streak swiping along its line, its tip
// flaring, then the whole cut fading
export function drawSlash(
  ctx: CanvasRenderingContext2D,
  slash: Slash,
  ms: number,
  width: number,
  now: number,
): void {
  if (ms < slash.startMs || ms > slash.endMs + FADE_MS) return;
  const u = clamp01((ms - slash.startMs) / (slash.endMs - slash.startMs));
  const fade = 1 - clamp01((ms - slash.endMs) / FADE_MS);
  tip.x = slash.from.x + (slash.to.x - slash.from.x) * u;
  tip.y = slash.from.y + (slash.to.y - slash.from.y) * u;
  drawBeam(ctx, slash.from, tip, width, fade);
  if (u < 1) drawBeamFlare(ctx, tip, width * TIP_FLARE, 1, now);
}

// glitter spilling out of the cut once it's through, `size` px a speck
export function drawSliceSpill(
  ctx: CanvasRenderingContext2D,
  slash: Slash,
  ms: number,
  size: number,
  count = 14,
): void {
  const since = ms - slash.endMs;
  if (since < 0 || since > SPILL_MS) return;
  const t = since / SPILL_MS;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < count; i++) {
    const v = (i + 0.5) / count;
    const side = (hash01(i, slash.startMs) - 0.5) * 2 * SPILL_SCATTER * size;
    stampGlimmer(
      ctx,
      slash.from.x + (slash.to.x - slash.from.x) * v + slash.n.x * side,
      slash.from.y +
        (slash.to.y - slash.from.y) * v +
        slash.n.y * side +
        SPILL_FALL * t * t,
      size * (1 - t),
      i + slash.startMs,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// how far a piece whose middle is `centre` has slid apart by ms: `gap` px
// along every cut that's through, away from it; written into `into`
export function sliceOffset(
  slashes: readonly Slash[],
  centre: Point,
  ms: number,
  gap: number,
  into: Point,
): Point {
  into.x = 0;
  into.y = 0;
  for (const s of slashes) {
    const apart = clamp01((ms - s.endMs) / APART_MS);
    if (apart <= 0) continue;
    const side =
      (centre.x - s.from.x) * s.n.x + (centre.y - s.from.y) * s.n.y >= 0 ? 1 : -1;
    into.x += s.n.x * side * gap * apart;
    into.y += s.n.y * side * gap * apart;
  }
  return into;
}
