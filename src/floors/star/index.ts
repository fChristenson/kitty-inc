import type { Floor } from "../../gameState";
import { drawCartoonText } from "../../utils";

// mirrors buildings/outerWall's own SIDE_WALL_WIDTH (WALL_WIDTH*2) — duplicated
// locally instead of imported to avoid a floors<->buildings circular import
const LEFT_WALL_WIDTH = 56;
// inside the room, top-left corner: 40px right of the left outer wall's inner edge
const MARGIN_X = LEFT_WALL_WIDTH + 40;
const MARGIN_Y = 44 + 20;
export const STAR_Y = MARGIN_Y;
const FONT = '900 54px "Fredoka", system-ui, sans-serif';

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
