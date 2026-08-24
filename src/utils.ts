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
