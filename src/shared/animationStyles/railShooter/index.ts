// the rail shooter's world (Space Harrier style) in shared/animationStyles/fps's world: a
// checkerboard plain racing at the view and pillars standing on it. Its hero
// is shared/animationStyles/race's ship flying low over the plain; its foes and shots are wisps
import { COLOR } from "../../../palette";
import { drawFpsFace, FPS_NEAR, fpsHorizon, type Fps } from "../fps";

// the plain's squares, how many rows ahead and how far across it's drawn
const TILE = 1;
const REACH = 22;
const ACROSS = 6;
// a pillar: its face, the lit strip down its left edge, its cap
const PILLAR = COLOR.silverTicketGray;
const PILLAR_EDGE = COLOR.white;
const PILLAR_CAP = COLOR.heavenlyGold;
const EDGE = 0.18;
const CAP_OVER = 0.12;
const CAP_HIGH = 0.12;

export interface RailPillar {
  x: number;
  z: number;
  high: number;
  // its half width
  half: number;
}

// every other square of the plain in `check` out to `end`, as one path (the
// plain's own colour is the ground, drawn first with drawFpsGround); its
// corners are projected here, as fpsSight would, without making a point each
export function drawCheckerPlain(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  check: string,
  end: number,
): void {
  const { view, lens, cam, bend } = fps;
  const horizon = fpsHorizon(fps);
  const near = cam.z + FPS_NEAR * 1.01;
  const row0 = Math.floor(cam.z / TILE);
  const row1 = Math.min(Math.ceil(end / TILE), row0 + REACH);
  const col0 = Math.floor(cam.x / TILE) - ACROSS;
  const col1 = col0 + 2 * ACROSS;
  ctx.beginPath();
  for (let row = row0; row < row1; row++) {
    const za = Math.max(row * TILE, near);
    const zb = Math.min((row + 1) * TILE, end);
    if (zb <= za) continue;
    const sa = (lens.focal * view.w) / (za - cam.z);
    const sb = (lens.focal * view.w) / (zb - cam.z);
    const ya = horizon + cam.y * sa;
    const yb = horizon + cam.y * sb;
    const xa = view.cx + ((bend ? bend(za) : 0) - cam.x) * sa;
    const xb = view.cx + ((bend ? bend(zb) : 0) - cam.x) * sb;
    for (let col = col0; col < col1; col++) {
      if ((((row + col) % 2) + 2) % 2 !== 0) continue;
      const left = col * TILE;
      const right = left + TILE;
      ctx.moveTo(xa + left * sa, ya);
      ctx.lineTo(xa + right * sa, ya);
      ctx.lineTo(xb + right * sb, yb);
      ctx.lineTo(xb + left * sb, yb);
      ctx.closePath();
    }
  }
  ctx.fillStyle = check;
  ctx.fill();
}

// a pillar standing on the plain, its lit edge and its gold cap
export function drawRailPillar(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  { x, z, high, half }: RailPillar,
): void {
  drawFpsFace(ctx, fps, z, x - half, x + half, 0, high, PILLAR);
  drawFpsFace(
    ctx,
    fps,
    z,
    x - half,
    x - half * (1 - 2 * EDGE),
    0,
    high,
    PILLAR_EDGE,
  );
  drawFpsFace(
    ctx,
    fps,
    z,
    x - half - CAP_OVER * half * 2,
    x + half + CAP_OVER * half * 2,
    high,
    high + CAP_HIGH,
    PILLAR_CAP,
  );
}
