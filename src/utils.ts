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
// can never overflow into a giant unformatted string at big values
const MAGNITUDE_SUFFIXES: { value: number; suffix: string }[] = [
  { value: 1e33, suffix: "Dc" }, // decillion
  { value: 1e30, suffix: "No" }, // nonillion
  { value: 1e27, suffix: "Oc" }, // octillion
  { value: 1e24, suffix: "Sp" }, // septillion
  { value: 1e21, suffix: "Sx" }, // sextillion
  { value: 1e18, suffix: "Qi" }, // quintillion
  { value: 1e15, suffix: "Qa" }, // quadrillion
  { value: 1e12, suffix: "T" }, // trillion
  { value: 1e9, suffix: "B" }, // billion
  { value: 1e6, suffix: "M" }, // million
];

// compacts a non-negative number to a magnitude suffix (K/M/B/T/...) once it's
// big enough, always truncated to exactly 2 decimal places so every number
// shown in the game is the same width/format instead of drifting per caller
function formatCompactNumber(value: number): string {
  const safe = Math.max(0, value);
  if (safe < 1e6) return safe.toFixed(2);
  const tier =
    MAGNITUDE_SUFFIXES.find((t) => safe >= t.value) ??
    MAGNITUDE_SUFFIXES[MAGNITUDE_SUFFIXES.length - 1];
  return `${(safe / tier.value).toFixed(2)}${tier.suffix}`;
}

// the only way a $ amount should be formatted anywhere in the game, e.g. "$1.23M"
export function formatPrice(value: number): string {
  return `$${formatCompactNumber(Math.floor(Math.max(0, value)))}`;
}

// time-unit tiers for formatTime; smallest-to-largest order matters for the lookup below
const TIME_UNITS: { seconds: number; suffix: string }[] = [
  { seconds: 86400, suffix: "d" },
  { seconds: 3600, suffix: "h" },
  { seconds: 60, suffix: "m" },
  { seconds: 1, suffix: "s" },
];

// the only way a duration/interval should be formatted anywhere in the game, e.g.
// "1.50h". Once past days, the leftover day count is further compacted with the
// same magnitude suffixes formatPrice uses (e.g. "3.18Md"), so this can never
// overflow into a giant unformatted number the way a raw day count eventually would
export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const unit =
    TIME_UNITS.find((u) => safe >= u.seconds) ??
    TIME_UNITS[TIME_UNITS.length - 1];
  return `${formatCompactNumber(safe / unit.seconds)}${unit.suffix}`;
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
  ctx.fillStyle = "#000000";
  roundRect(ctx, x + CARTOON_SHADOW_OFFSET, y + CARTOON_SHADOW_OFFSET, w, h, r);
  ctx.fill();

  ctx.fillStyle = fillColor;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  drawGlossHighlight(ctx, x, y, w, h, r);

  if (!border) return;
  ctx.lineWidth = CARTOON_OUTLINE_WIDTH;
  ctx.strokeStyle = "#FFFFFF";
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

// bold cartoon text: thick black stroke behind a white fill, no soft shadow/blur
export function drawCartoonText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor = "#FFFFFF",
): void {
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#000000";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}
