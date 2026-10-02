// a one-off copy of the frozen screen, for events that cut, move or flip
// pieces of it (Shatter's shards, flipping tiles): take it from an event's
// drawUnder before drawing over the frame, then draw parts of it back
// anywhere in floor-local coords
export interface ScreenCopy {
  canvas: HTMLCanvasElement;
  // the floor-local transform it was taken under
  at: DOMMatrix;
}

export function copyScreen(ctx: CanvasRenderingContext2D): ScreenCopy {
  const canvas = document.createElement("canvas");
  canvas.width = ctx.canvas.width;
  canvas.height = ctx.canvas.height;
  canvas.getContext("2d")!.drawImage(ctx.canvas, 0, 0);
  return { canvas, at: ctx.getTransform() };
}

// the copy's floor-local box x, y, w, h drawn into the box dx, dy, dw, dh
export function drawScreenPart(
  ctx: CanvasRenderingContext2D,
  shot: ScreenCopy,
  x: number,
  y: number,
  w: number,
  h: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const m = shot.at;
  const sx = m.a * x + m.e;
  const sy = m.d * y + m.f;
  const sw = m.a * w;
  const sh = m.d * h;
  if (sw <= 0 || sh <= 0) return;
  // clipped to the canvas, the destination shrinking to match
  const x0 = Math.max(0, sx);
  const y0 = Math.max(0, sy);
  const x1 = Math.min(shot.canvas.width, sx + sw);
  const y1 = Math.min(shot.canvas.height, sy + sh);
  if (x1 <= x0 || y1 <= y0) return;
  const kx = dw / sw;
  const ky = dh / sh;
  ctx.drawImage(
    shot.canvas,
    x0,
    y0,
    x1 - x0,
    y1 - y0,
    dx + (x0 - sx) * kx,
    dy + (y0 - sy) * ky,
    (x1 - x0) * kx,
    (y1 - y0) * ky,
  );
}
