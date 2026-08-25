import type { Floor } from "../gameState";
import { drawCartoonText, drawGlossHighlight } from "../utils";
import { STAR_Y, STAR_RADIUS } from "./star";

// sits directly under star.ts's upgrade star, same left margin/style
const MARGIN = 24;
const ICON_Y = STAR_Y + STAR_RADIUS * 2 + 20;
const ICON_RADIUS = 26;

// a small badge (matches the star's circular cartoon treatment) with a simplified
// worker glyph inside, so it reads as "this many workers" at a glance
function drawWorkerGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.42, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - r * 0.42, cy - r * 0.05, r * 0.84, r * 0.68, r * 0.25);
  ctx.fill();
}

// shows a worker icon + how many workers this floor has bought, drawn just below the star
export function drawWorkerCount(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  const cx = MARGIN + ICON_RADIUS;
  const cy = ICON_Y;

  ctx.beginPath();
  ctx.arc(cx, cy, ICON_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "#3B82F6";
  ctx.fill();
  drawGlossHighlight(
    ctx,
    cx - ICON_RADIUS,
    cy - ICON_RADIUS,
    ICON_RADIUS * 2,
    ICON_RADIUS * 2,
    ICON_RADIUS,
  );
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(cx, cy, ICON_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  drawWorkerGlyph(ctx, cx, cy, ICON_RADIUS);

  ctx.font = "900 36px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawCartoonText(ctx, `${floor.workerCount}`, cx + ICON_RADIUS + 14, cy + 1);
}
