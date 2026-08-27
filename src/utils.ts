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

// shared DOM click-press animation (see style.css's "worker-menu-item-press"
// keyframes) — used by every worker-menu__item buyable list button (upgrade menu,
// boost menu, ...) so they all bounce identically. Resolves once the animation
// finishes, so a caller can await it before replacing/re-rendering the button
// (otherwise the button gets torn out of the DOM before the animation ever paints)
export function triggerButtonPress(button: HTMLButtonElement): Promise<void> {
  button.classList.remove("worker-menu__item--pressed");
  void button.offsetWidth; // force reflow so re-adding the class restarts the animation
  button.classList.add("worker-menu__item--pressed");
  return new Promise((resolve) => {
    button.addEventListener("animationend", () => resolve(), { once: true });
  });
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

// the HUD's own total-income number specifically: shown as a full, comma-separated
// number (not compacted) for as long as it fits within 12 digits, so the player can
// actually watch every digit tick up in real time instead of it barely moving once
// abbreviated. Once it'd overflow past that (1e12+), falls back to the same compact
// magnitude-suffix format formatPrice uses everywhere else, so it never runs off the
// edge of the HUD
export function formatTotalIncome(value: number): string {
  const safe = Math.floor(Math.max(0, value));
  if (safe < 1e12) {
    return `$${safe.toLocaleString("en-US")}`;
  }
  return formatPrice(safe);
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
  // arcTo doesn't reliably clamp a radius that's too big for the rect's own w/h on
  // its own — asks for a bigger corner than the straight edges can fit and one
  // side silently collapses to a flat/square corner instead of a smaller rounded
  // one. Clamping here once guarantees every corner is always well-formed.
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// shared cartoon look for every HUD panel/button: flat fill with a thick bold white
// outline
export const CARTOON_OUTLINE_WIDTH = 5;

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

// rounded shape (see src/assets/ref.png): from the outside in, a black outline, a
// white ring, a thin ring shaded darker from fillColor, then either a solid fill
// (glossy=false, e.g. the income bar's dark track) or a vertical light-to-dark
// gradient fill (glossy=true, e.g. the bar's green fill and the upgrade button) —
// ring widths are fractions of h (ratios sampled from ref.png's own button, whose
// rings were ~4%/7%/6% of its height) rather than fixed pixel counts, since these
// shapes get drawn at wildly different on-screen sizes depending on camera zoom —
// a fixed pixel width was crisp in ref.png's own resolution but shrank to an
// indistinguishable 1px blur once scaled down to the game's actual small on-screen
// button/bar size. radius defaults to a full pill/stadium (matches the income bar);
// pass a smaller fixed value for a plain rounded-rectangle look (matches the
// upgrade button, which is NOT a full pill)
const PILL_BLACK_OUTLINE_PCT = 0.05;
const PILL_WHITE_RING_PCT = 0.09;
const PILL_DARK_RING_PCT = 0.07;

// draws the black/white/dark-shade ring trio as three centered strokes (not fills),
// so it can safely be layered ON TOP of content already filled inside those bounds
// (e.g. the income bar's track + green progress fill, drawn as separate pieces then
// wrapped in one ring afterward) without covering it up. fillColor is only used to
// derive the innermost dark ring's shade (see ref.png: it's a darker version of
// whatever's inside, not plain black). Returns the total inset used, so a caller
// drawing its own inner fill can match it exactly.
export function drawPillBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fillColor: string,
): number {
  const blackW = h * PILL_BLACK_OUTLINE_PCT;
  const whiteW = h * PILL_WHITE_RING_PCT;
  const darkW = h * PILL_DARK_RING_PCT;

  const blackInset = blackW / 2;
  roundRect(
    ctx,
    x + blackInset,
    y + blackInset,
    w - blackInset * 2,
    h - blackInset * 2,
    Math.max(0, radius - blackInset),
  );
  ctx.lineWidth = blackW;
  ctx.strokeStyle = COLOR.black;
  ctx.stroke();

  const whiteInset = blackW + whiteW / 2;
  roundRect(
    ctx,
    x + whiteInset,
    y + whiteInset,
    w - whiteInset * 2,
    h - whiteInset * 2,
    Math.max(0, radius - whiteInset),
  );
  ctx.lineWidth = whiteW;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();

  const darkInset = blackW + whiteW + darkW / 2;
  roundRect(
    ctx,
    x + darkInset,
    y + darkInset,
    w - darkInset * 2,
    h - darkInset * 2,
    Math.max(0, radius - darkInset),
  );
  ctx.lineWidth = darkW;
  ctx.strokeStyle = shadeColor(fillColor, -0.65);
  ctx.stroke();

  return blackW + whiteW + darkW;
}

export function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  border = true,
  glossy = false,
  radius: number = h / 2,
): void {
  const r = radius;

  const inset = border ? drawPillBorder(ctx, x, y, w, h, r, fillColor) : 0;
  const fx = x + inset;
  const fy = y + inset;
  const fw = w - inset * 2;
  const fh = h - inset * 2;
  // must shrink by the same inset as the border rings so its corner arc shares
  // their center — using the un-shrunk radius here mismatched the rings' own
  // corners and left a visible gap
  roundRect(ctx, fx, fy, fw, fh, Math.max(0, r - inset));
  if (glossy) {
    const gradient = ctx.createLinearGradient(fx, fy, fx, fy + fh);
    gradient.addColorStop(0, shadeColor(fillColor, 0.75));
    gradient.addColorStop(1, shadeColor(fillColor, -0.15));
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = fillColor;
  }
  ctx.fill();
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

// glossy layered-ring button (see src/assets/button.jfif): a white ring, a
// darker-shade border, then a gradient fill with an upper-left glossy sheen — same
// cream-ring language as the dialog panels (style.css), just built from one accent
// color instead of hardcoded tan/cream
export function drawGlossyButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: string,
): void {
  const RING_W = 10;
  const BORDER_W = 6;

  const ringColor = COLOR.buttonRing;
  const borderColor = shadeColor(fillColor, -0.55);
  const highlightColor = shadeColor(fillColor, 0.55);

  // every nested layer keeps the SAME corner radius (not shrunk by its own inset) —
  // shrinking it layer by layer runs out almost immediately for a shallow button
  // like this and leaves the border/fill layers square-cornered; same simplification
  // style.css's box-shadow ring trick already relies on for the dialog panels
  const ringX = x;
  const ringY = y;
  const ringW = w;
  const ringH = h;
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
