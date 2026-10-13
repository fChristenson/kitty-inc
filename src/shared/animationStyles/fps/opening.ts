// an opening of the screen's shape in the first-person world, the frozen
// floors seen through it: the view lands back on them by closing in on it
// until it fills the screen exactly
import { drawScreenPart, type ScreenCopy } from "../../screenCopy";
import { fpsSight, type Fps } from "./world";

// the opening `w` wide at depth z, its sill at height `sill`, high as the
// screen's shape makes it (aspect: the screen's height over its width)
export function drawFpsOpening(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  floors: ScreenCopy,
  z: number,
  w: number,
  sill: number,
  aspect: number,
): void {
  const { view } = fps;
  const a = fpsSight(fps, -w / 2, sill + w * aspect, z);
  const b = fpsSight(fps, w / 2, sill, z);
  if (!a || !b) return;
  drawScreenPart(
    ctx,
    floors,
    view.x,
    view.y,
    view.w,
    view.h,
    a.x,
    a.y,
    b.x - a.x,
    b.y - a.y,
  );
}

// where the eye must be for that opening to fill the screen, with the lens's
// focal length and its horizon midway
export function fpsOpeningLanding(
  focal: number,
  z: number,
  w: number,
  sill: number,
  aspect: number,
): { z: number; y: number } {
  return { z: z - focal * w, y: sill + (w * aspect) / 2 };
}
