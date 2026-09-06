import { PLATFORM_COLOR, drawPlatformSurface, type Platform } from "./index";
import { LINE_REWARD_COLOR } from "./makeJumpPath";

// draws a single short (small-kind) platform segment, colored by its own
// x125/upgrade mark (see makeJumpPath) when it has one
export function drawShortLineSegment(
  ctx: CanvasRenderingContext2D,
  platform: Platform,
): void {
  ctx.fillStyle = platform.reward
    ? LINE_REWARD_COLOR[platform.reward]
    : PLATFORM_COLOR;
  drawPlatformSurface(ctx, platform);
}

// draws every "small" platform — the short jumpable segments (including
// both branches of a fork) between main-line rest stops
export function drawShortLine(
  ctx: CanvasRenderingContext2D,
  platforms: Platform[],
): void {
  for (const platform of platforms) {
    if (platform.kind !== "small") continue;
    drawShortLineSegment(ctx, platform);
  }
}
