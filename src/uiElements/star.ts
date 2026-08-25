import type { Floor } from "../gameState";
import { drawCartoonText } from "../utils";

// sits directly under floorNumber.ts's "N / total" label, same left margin
const MARGIN = 24;
export const STAR_Y = MARGIN + 90;
export const STAR_RADIUS = 26;

function starPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
): void {
  const points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// shows a star + how many upgrades this floor has bought, drawn just below the floor number
export function drawUpgradeStar(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  const cx = MARGIN + STAR_RADIUS;
  const cy = STAR_Y;

  starPath(ctx, cx, cy, STAR_RADIUS, STAR_RADIUS * 0.45);
  ctx.fillStyle = "#FBBF24";
  ctx.fill();

  // glossy highlight, clipped to the star's own path (mirrors drawGlossHighlight in utils.ts,
  // which only works on rounded rects) so the icon reads shiny like every other cartoon shape
  ctx.save();
  starPath(ctx, cx, cy, STAR_RADIUS, STAR_RADIUS * 0.45);
  ctx.clip();
  const gloss = ctx.createLinearGradient(
    cx,
    cy - STAR_RADIUS,
    cx,
    cy + STAR_RADIUS,
  );
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.65)");
  gloss.addColorStop(0.45, "rgba(255, 255, 255, 0.15)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(
    cx - STAR_RADIUS,
    cy - STAR_RADIUS,
    STAR_RADIUS * 2,
    STAR_RADIUS * 2,
  );
  ctx.restore();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#FFFFFF";
  starPath(ctx, cx, cy, STAR_RADIUS, STAR_RADIUS * 0.45);
  ctx.stroke();

  ctx.font = "900 36px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawCartoonText(ctx, `${floor.upgradeCount}`, cx + STAR_RADIUS + 14, cy + 1);
}
