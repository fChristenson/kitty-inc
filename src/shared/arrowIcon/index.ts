import { COLOR } from "../../palette";

// the same stroked "arrow-up" icon as drawArrowIcon below, as raw DOM markup
// instead of a canvas path — background/cityMap's own prev/next/pointer
// arrows and hud/corporationBoostMenu's crit-list chevron both request this at
// their own size rather than each hand-rolling the same path data. Rotated to
// point whichever direction via CSS on the caller's own wrapper, same as
// cityMap already did before this was extracted
export function arrowIconMarkup(size: number): string {
  return `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="black" stroke-width="9">
        <path d="M12 19V5"></path>
        <path d="M5 12l7-7 7 7"></path>
      </g>
      <g stroke="currentColor" stroke-width="5">
        <path d="M12 19V5"></path>
        <path d="M5 12l7-7 7 7"></path>
      </g>
    </svg>
  `;
}

// the icon rastered once per color and pixel size (rounded up to a step, so a
// wiggling icon reuses a few) and stamped every frame: stroking the paths per
// floor per frame added up
const SPRITE_STEP = 16;
const sprites = new Map<string, HTMLCanvasElement>();

function arrowSprite(px: number, color: string): HTMLCanvasElement {
  const key = `${color}|${px}`;
  let sprite = sprites.get(key);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = px;
  const c = sprite.getContext("2d")!;
  c.scale(px / 24, px / 24);
  const strokePath = (width: number, strokeColor: string): void => {
    c.beginPath();
    c.moveTo(12, 19);
    c.lineTo(12, 5);
    c.moveTo(5, 12);
    c.lineTo(12, 5);
    c.lineTo(19, 12);
    c.strokeStyle = strokeColor;
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
  };
  strokePath(9, COLOR.black);
  strokePath(5, color);
  sprites.set(key, sprite);
  return sprite;
}

// replicates the exact stroked "arrow-up" icon background/cityMap/index.ts's
// ARROW_SVG uses for its prev/next buttons, as a canvas path — so any
// canvas-drawn UI needing the same icon doesn't invent its own shape. Native
// icon geometry is a 24x24 viewBox: a vertical stem (12,19)-(12,5) plus a
// chevron head (5,12)-(12,5)-(19,12), drawn twice like the SVG does — a fatter
// black stroke behind, a slimmer colored stroke in front, for a bordered look
export function drawArrowIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number, // on-screen width/height; native icon is drawn in a 24x24 box
  color: string = COLOR.white,
): void {
  const m = ctx.getTransform();
  const scale = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  const px = Math.ceil((size * scale) / SPRITE_STEP) * SPRITE_STEP;
  ctx.drawImage(
    arrowSprite(px, color),
    cx - size / 2,
    cy - size / 2,
    size,
    size,
  );
}
