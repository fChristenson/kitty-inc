import { PLATFORM_COLOR, drawPlatformSurface, type Platform } from "./index";

// draws every "long" (rest-stop) platform — the game's one persistent main
// line that small platforms/forks branch off of and return to
export function drawMainLine(
  ctx: CanvasRenderingContext2D,
  platforms: Platform[],
): void {
  ctx.fillStyle = PLATFORM_COLOR;
  for (const platform of platforms) {
    if (platform.kind !== "long") continue;
    drawPlatformSurface(ctx, platform);
  }
}
