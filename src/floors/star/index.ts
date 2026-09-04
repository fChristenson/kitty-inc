import type { Floor } from "../../gameState";
import { drawCartoonText } from "../../utils";

// mirrors buildings/outerWall's own SIDE_WALL_WIDTH (WALL_WIDTH*2) — duplicated
// locally instead of imported to avoid a floors<->buildings circular import
const LEFT_WALL_WIDTH = 56;
// inside the room, top-left corner: 40px right of the left outer wall's inner edge
const MARGIN_X = LEFT_WALL_WIDTH + 40;
const MARGIN_Y = 44 + 20;
export const STAR_Y = MARGIN_Y;
export const STAR_X = MARGIN_X;
const FONT_SIZE = 54;
export const STAR_BOTTOM_Y = STAR_Y + FONT_SIZE;
const FONT = `900 ${FONT_SIZE}px "Fredoka", system-ui, sans-serif`;

function labelText(floor: Floor): string {
  return `Lvl ${floor.upgradeCount}`;
}

// throwaway canvas just for measureText — floorInteractions.ts needs the label's
// real width to aim a coin burst at its center, but has no live ctx of its own
let measureCtx: CanvasRenderingContext2D | null = null;
function labelWidth(floor: Floor): number {
  measureCtx ??= document.createElement("canvas").getContext("2d")!;
  measureCtx.font = FONT;
  return measureCtx.measureText(labelText(floor)).width;
}

// floor-local center of the indicator (accounting for the label's own text width),
// for aiming a coin-burst celebration at it
export function getUpgradeIndicatorCenter(floor: Floor): {
  x: number;
  y: number;
} {
  return { x: MARGIN_X + labelWidth(floor) / 2, y: STAR_Y };
}

// the label's own right edge, floor-local — grows/shrinks as floor.upgradeCount
// gains digits, so anything anchored past it (see floors/upgradeArrow) tracks
// the text's real width instead of a fixed guess
export function getStarRightX(floor: Floor): number {
  return MARGIN_X + labelWidth(floor);
}

// shows a "Lvl N" label for how many upgrades this floor has bought, drawn at the
// room's inside top-left corner
export function drawUpgradeStar(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  const cx = MARGIN_X;
  const cy = STAR_Y;

  ctx.font = FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  drawCartoonText(ctx, labelText(floor), cx, cy);
}
