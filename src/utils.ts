import { COLOR } from "./palette";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// suffix tiers for compact large-number formatting (short scale), shared by
// formatPrice/formatTime so every number on screen scales the same way and
// can never overflow into a giant unformatted string at big values. Short
// abbreviations (not spelled-out words) so the number always fits the small
// in-canvas upgrade button, not just the wider HUD menus
const MAGNITUDE_SUFFIXES: { value: number; suffix: string }[] = [
  { value: 1e33, suffix: "Dc" },
  { value: 1e30, suffix: "No" },
  { value: 1e27, suffix: "Oc" },
  { value: 1e24, suffix: "Sp" },
  { value: 1e21, suffix: "Sx" },
  { value: 1e18, suffix: "Qi" },
  { value: 1e15, suffix: "Qa" },
  { value: 1e12, suffix: "T" },
  { value: 1e9, suffix: "B" },
  { value: 1e6, suffix: "M" },
];

// compacts a non-negative number to a magnitude suffix (K/M/B/T/...) once it's
// big enough, always a whole number (no decimals) so every number shown in the
// game is the same format instead of drifting per caller
function formatCompactNumber(value: number): string {
  const safe = Math.max(0, value);
  if (safe < 1e6) return safe.toFixed(0);
  const largestTier = MAGNITUDE_SUFFIXES[0];
  // past the largest named tier (decillion), dividing by it forever just grows the
  // mantissa unboundedly (e.g. "323257910Dc") — switch to scientific notation instead
  if (safe >= largestTier.value * 1000) {
    return safe.toExponential(0).replace("+", "");
  }
  const tier =
    MAGNITUDE_SUFFIXES.find((t) => safe >= t.value) ??
    MAGNITUDE_SUFFIXES[MAGNITUDE_SUFFIXES.length - 1];
  return `${(safe / tier.value).toFixed(0)}${tier.suffix}`;
}

// the only way a $ amount should be formatted anywhere in the game, e.g. "$2M"
export function formatPrice(value: number): string {
  return `$${formatCompactNumber(Math.floor(Math.max(0, value)))}`;
}

// the only way a duration/interval should be formatted anywhere in the game, e.g.
// "00:01:30". Whole hours can grow past 24 rather than wrapping into days, so this
// still never overflows into a giant unformatted number at long intervals. Sub-second
// durations floor to "00:00:00" rather than showing a fraction (already read as "fast"
// via incomePanel.ts's orbiting-dot bar).
export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const totalSeconds = Math.floor(safe);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const wholeSeconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)}`;
}

// draws a rounded-rect path (does not fill/stroke) for canvas HUD panels
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// shared cartoon look for every HUD panel/button: flat fill, thick bold white
// outline, and a hard-edged (unblurred) offset shadow instead of a soft drop shadow
export const CARTOON_OUTLINE_WIDTH = 5;
export const CARTOON_SHADOW_OFFSET = 7;

// glossy plastic-button highlight: bright streak at the top fading to nothing by the
// bottom, clipped to the given rounded-rect. shared by drawCartoonPanel and any other
// flat fill (e.g. the income bar) that should read as shiny rather than matte
export function drawGlossHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const gloss = ctx.createLinearGradient(x, y, x, y + h);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.65)");
  gloss.addColorStop(0.45, "rgba(255, 255, 255, 0.15)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawCartoonPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: string,
  border = true,
): void {
  ctx.fillStyle = COLOR.black;
  roundRect(ctx, x + CARTOON_SHADOW_OFFSET, y + CARTOON_SHADOW_OFFSET, w, h, r);
  ctx.fill();

  ctx.fillStyle = fillColor;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  drawGlossHighlight(ctx, x, y, w, h, r);

  if (!border) return;
  ctx.lineWidth = CARTOON_OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR.white;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

// bold cartoon text: thick stroke behind a fill color, no soft shadow/blur.
// strokeColor/strokeWidth default to the standard black 5px outline every other
// caller relies on; callers wanting a heavier/different-colored outline (e.g. the
// HUD's big total-income text) can override both.
export function drawCartoonText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor: string = COLOR.white,
  strokeColor: string = COLOR.black,
  strokeWidth = 5,
): void {
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

// lightens (positive amount) or darkens (negative amount, -1..1) a "#rrggbb" color;
// shared helper for deriving a button's ring/border/highlight tones from one fill color
function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const channels = [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
  return `#${channels
    .map((c) =>
      Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

// glossy layered-ring button (see src/assets/button.jfif): a dark outline, a white
// ring, a darker-shade border, then a gradient fill with an upper-left glossy sheen —
// same cream-ring language as the dialog panels (style.css), just built from one
// accent color instead of hardcoded tan/cream. The outline is drawn twice, the second
// copy shifted down and left showing through underneath, so the bottom edge reads
// noticeably thicker than the top/sides for a chunky "resting on the surface" look
export function drawGlossyButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: string,
): void {
  const OUTLINE_W = 8;
  const RING_W = 10;
  const BORDER_W = 6;
  const BOTTOM_SHADOW_EXTRA = 18;

  const outlineColor = COLOR.buttonOutline;
  const ringColor = COLOR.buttonRing;
  const borderColor = shadeColor(fillColor, -0.55);
  const highlightColor = shadeColor(fillColor, 0.55);

  ctx.fillStyle = outlineColor;
  roundRect(ctx, x, y + BOTTOM_SHADOW_EXTRA, w, h, r);
  ctx.fill();
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  // every nested layer keeps the SAME corner radius (not shrunk by its own inset) —
  // shrinking it layer by layer runs out almost immediately for a shallow button
  // like this and leaves the border/fill layers square-cornered; same simplification
  // style.css's box-shadow ring trick already relies on for the dialog panels
  const ringX = x + OUTLINE_W;
  const ringY = y + OUTLINE_W;
  const ringW = w - OUTLINE_W * 2;
  const ringH = h - OUTLINE_W * 2;
  ctx.fillStyle = ringColor;
  roundRect(ctx, ringX, ringY, ringW, ringH, r);
  ctx.fill();

  const borderX = ringX + RING_W;
  const borderY = ringY + RING_W;
  const borderW = ringW - RING_W * 2;
  const borderH = ringH - RING_W * 2;
  ctx.fillStyle = borderColor;
  roundRect(ctx, borderX, borderY, borderW, borderH, r);
  ctx.fill();

  const fillX = borderX + BORDER_W;
  const fillY = borderY + BORDER_W;
  const fillW = borderW - BORDER_W * 2;
  const fillH = borderH - BORDER_W * 2;
  ctx.save();
  roundRect(ctx, fillX, fillY, fillW, fillH, r);
  ctx.clip();

  const gradient = ctx.createLinearGradient(fillX, fillY, fillX, fillY + fillH);
  gradient.addColorStop(0, highlightColor);
  gradient.addColorStop(1, fillColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(fillX, fillY, fillW, fillH);

  const sheen = ctx.createRadialGradient(
    fillX + fillW * 0.28,
    fillY + fillH * 0.15,
    0,
    fillX + fillW * 0.28,
    fillY + fillH * 0.15,
    fillW * 0.6,
  );
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(fillX, fillY, fillW, fillH);
  ctx.restore();
}
