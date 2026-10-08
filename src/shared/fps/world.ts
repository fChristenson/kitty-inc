// the world: x right, y up, z away from the view, all in screen widths,
// built from walls (planes of constant x), faces (constant z, looking at the
// view) and flats (constant y: ground, roads, roofs, ceilings)

// the screen in the canvas's space
export interface FpsScreen {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
}

export interface FpsLens {
  // how far behind the screen the eye sits, in screen widths: a unit at that
  // depth spans the screen's width
  focal: number;
  // the horizon's height down the screen, 0..1
  horizon: number;
  // how far the horizon rises up the screen as the camera tips to look down
  tip?: number;
}

export interface FpsCamera {
  x: number;
  y: number;
  z: number;
  // 0 looking ahead, 1 looking down
  tip: number;
}

export interface Fps {
  view: FpsScreen;
  lens: FpsLens;
  cam: FpsCamera;
}

export interface FpsPoint {
  x: number;
  y: number;
  // px a unit spans there
  s: number;
}

export type FpsCorner = [x: number, y: number, z: number];

// the nearest anything is drawn in front of the view
export const FPS_NEAR = 0.05;

export function fpsHorizon({ view, lens, cam }: Fps): number {
  return view.y + view.h * (lens.horizon - cam.tip * (lens.tip ?? 0));
}

// where the world's point (x, y, z) shows, null behind the view
export function fpsSight(
  fps: Fps,
  x: number,
  y: number,
  z: number,
): FpsPoint | null {
  const { view, lens, cam } = fps;
  const dz = z - cam.z;
  if (dz < FPS_NEAR) return null;
  const s = (lens.focal * view.w) / dz;
  return {
    x: view.cx + (x - cam.x) * s,
    y: fpsHorizon(fps) + (cam.y - y) * s,
    s,
  };
}

// a quad filled in `color`, cut off just in front of the view
export function fillFpsQuad(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  corners: FpsCorner[],
  color: string,
  alpha = 1,
): void {
  const near = fps.cam.z + FPS_NEAR;
  ctx.beginPath();
  for (let i = 0; i < corners.length; i++) {
    const [x, y, z] = corners[i];
    const p = fpsSight(fps, x, y, Math.max(z, near));
    if (!p) return;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// everything below the horizon (the ground) or above it (the sky, or a dark
// void behind a ceiling)
export function drawFpsGround(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  color: string,
  alpha = 1,
): void {
  const { view } = fps;
  const horizon = Math.max(view.y, fpsHorizon(fps));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(view.x, horizon, view.w, view.y + view.h - horizon);
  ctx.globalAlpha = 1;
}

export function drawFpsSky(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  color: string,
  alpha = 1,
): void {
  const { view } = fps;
  const horizon = Math.min(view.y + view.h, fpsHorizon(fps));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(view.x, view.y, view.w, horizon - view.y);
  ctx.globalAlpha = 1;
}

// a wall on the plane x, y0 to y1 high, za to zb along
export function drawFpsWall(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  x: number,
  y0: number,
  y1: number,
  za: number,
  zb: number,
  color: string,
  alpha = 1,
): void {
  if (zb < fps.cam.z + FPS_NEAR) return;
  fillFpsQuad(
    ctx,
    fps,
    [
      [x, y0, za],
      [x, y1, za],
      [x, y1, zb],
      [x, y0, zb],
    ],
    color,
    alpha,
  );
}

// a face looking at the view at depth z, x0 to x1 across, y0 to y1 high
export function drawFpsFace(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  z: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  color: string,
  alpha = 1,
): void {
  if (z < fps.cam.z + FPS_NEAR) return;
  fillFpsQuad(
    ctx,
    fps,
    [
      [x0, y0, z],
      [x0, y1, z],
      [x1, y1, z],
      [x1, y0, z],
    ],
    color,
    alpha,
  );
}

// a flat at height y, x0 to x1 across, za to zb along
export function drawFpsFlat(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  y: number,
  x0: number,
  x1: number,
  za: number,
  zb: number,
  color: string,
  alpha = 1,
): void {
  if (zb < fps.cam.z + FPS_NEAR) return;
  fillFpsQuad(
    ctx,
    fps,
    [
      [x0, y, za],
      [x1, y, za],
      [x1, y, zb],
      [x0, y, zb],
    ],
    color,
    alpha,
  );
}

// thin lines along a wall on the plane x, every `every` from y0 up to y1:
// boards, panel seams
export function drawFpsWallLines(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  x: number,
  y0: number,
  y1: number,
  every: number,
  za: number,
  zb: number,
  color: string,
  alpha = 1,
): void {
  const near = fps.cam.z + FPS_NEAR;
  if (zb < near) return;
  ctx.beginPath();
  for (let y = y0; y < y1; y += every) {
    const a = fpsSight(fps, x, y, Math.max(za, near));
    const b = fpsSight(fps, x, y, zb);
    if (!a || !b) continue;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
}
