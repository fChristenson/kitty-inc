// the frozen screen pulled back over the sky, shrunk round the middle of its
// bottom edge, for events that show more than the building in view; and
// copies of one floor's band of it, to stand in for more floors
import { COLOR } from "../../../palette";
import { drawScreenPart, type ScreenCopy } from "../../../shared/screenCopy";
import type { Point } from "../../../shared/wisp";
import type { CoverArea } from "../moneyCover";

const skies = new WeakMap<CoverArea, CanvasGradient>();

// where floor-local point p of the frame sits with the view zoomed by z
export function zoomPoint(
  area: CoverArea,
  z: number,
  p: Point,
  into: Point,
): Point {
  const middle = (area.left + area.right) / 2;
  into.x = middle + (p.x - middle) * z;
  into.y = area.bottom + (p.y - area.bottom) * z;
  return into;
}

export function drawZoomedFrame(
  ctx: CanvasRenderingContext2D,
  shot: ScreenCopy,
  area: CoverArea,
  z: number,
  settled = false,
): void {
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  // once it stops moving, the sky and the shrunk frame are baked into one blit
  if (settled) {
    let baked = settledFrames.get(shot);
    if (!baked) {
      const canvas = document.createElement("canvas");
      canvas.width = shot.canvas.width;
      canvas.height = shot.canvas.height;
      const bake = canvas.getContext("2d")!;
      bake.setTransform(shot.at);
      paint(bake, shot, area, z);
      baked = { canvas, at: shot.at };
      settledFrames.set(shot, baked);
    }
    drawScreenPart(
      ctx,
      baked,
      area.left,
      area.top,
      width,
      height,
      area.left,
      area.top,
      width,
      height,
    );
    return;
  }
  paint(ctx, shot, area, z);
}

const settledFrames = new WeakMap<ScreenCopy, ScreenCopy>();

function paint(
  ctx: CanvasRenderingContext2D,
  shot: ScreenCopy,
  area: CoverArea,
  z: number,
): void {
  let sky = skies.get(area);
  if (!sky) {
    sky = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    sky.addColorStop(0, COLOR.skySpace);
    sky.addColorStop(1, COLOR.skyGround);
    skies.set(area, sky);
  }
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  ctx.fillStyle = sky;
  ctx.fillRect(area.left, area.top, width, height);
  drawScreenPart(
    ctx,
    shot,
    area.left,
    area.top,
    width,
    height,
    (area.left + area.right) / 2 - (width * z) / 2,
    area.bottom - height * z,
    width * z,
    height * z,
  );
}

// the frame's band from top to top + height (floor-local), baked once to be
// drawn `width` wide; `height` is its drawn height in floor-local units
export function bakeFrameBand(
  shot: ScreenCopy,
  area: CoverArea,
  top: number,
  height: number,
  width: number,
): { canvas: HTMLCanvasElement; height: number } {
  const span = area.right - area.left;
  const drawnHeight = (height * width) / span;
  const scale = shot.at.a;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(drawnHeight * scale));
  drawScreenPart(
    canvas.getContext("2d")!,
    shot,
    area.left,
    top,
    span,
    height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return { canvas, height: drawnHeight };
}
