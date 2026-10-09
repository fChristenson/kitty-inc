// the jelly pop a floor's "Lvl N" label does on every 10th level (and so on
// reaching the level cap): blown out big, then wobbling back, never smaller
// than at rest
const POP = 0.6;
export const LEVEL_POP_MS = 700;
const POP_RISE_MS = 40;
const POP_DECAY_MS = 170;
const POP_WOBBLE_MS = 230;

// pops whatever is drawn next round (cx, cy), `ms` into the pop
export function applyLevelPop(
  ctx: CanvasRenderingContext2D,
  ms: number,
  cx: number,
  cy: number,
): void {
  if (ms < 0 || ms >= LEVEL_POP_MS) return;
  const pop =
    POP * Math.exp(-ms / POP_DECAY_MS) * Math.min(1, ms / POP_RISE_MS);
  if (pop <= 0) return;
  const phase = (ms / POP_WOBBLE_MS) * Math.PI * 2;
  ctx.translate(cx, cy);
  ctx.scale(
    1 + pop * (0.5 + 0.5 * Math.cos(phase)),
    1 + pop * (0.5 + 0.5 * Math.cos(phase + 0.9)),
  );
  ctx.translate(-cx, -cy);
}
