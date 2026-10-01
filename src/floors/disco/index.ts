import {
  FLOOR_W,
  FLOOR_H,
  SIDE_WALL_WIDTH,
  ROOM_WALL_OVERLAP_PX,
  ROOM_CONTENT_Y_OFFSET,
  ROOM_CONTENT_SCALE,
  ROOM_CONTENT_SCALE_X,
} from "../constants";
import { hasOnlyPermaWorkers } from "../worker";
import { drawTwinkle, hash01 } from "../../shared/twinkle";
import type { Floor } from "../../gameState";

// a floor whose every worker is perma-tiered turns into a disco: the room art is
// dimmed and coloured beams sweep down from a mirror ball, with spots on the floor

const DIM_ALPHA = 0.5;
const BEAM_COUNT = 4;
const BEAM_HALF_ANGLE = 0.13;
const BEAM_SWEEP = 0.65;
const BEAM_PERIOD_MS = 3400;
const SPOT_COUNT = 5;
const SPOT_PERIOD_MS = 5200;
const HUE_SPEED = 0.06; // degrees per ms
const BALL_RADIUS = 45;
const BALL_DROP = 70;
// one facet column passes per this long; a full turn is 12 of them
const FACET_STEP_MS = 900;
const FACET_COLUMNS = 6; // across the visible half
const FACET_ROWS = 5;
// where the light hitting the ball comes from, as a phase across its face
const LIGHT_PHASE = Math.PI * 0.35;
const LIT_FACET_SHARE = 0.35;
// shine twinkles, all the same size, popping at spots spread over the ball
const SHINE_COUNT = 6;
const SHINE_MS = 800;
const SHINE_SIZE = 24;
const FLECK_COUNT = 46;
// the room art's own floor line, as a fraction of its height
const FLOOR_LINE = 650 / FLOOR_H;

const room = {
  x: SIDE_WALL_WIDTH - ROOM_WALL_OVERLAP_PX,
  y: ROOM_CONTENT_Y_OFFSET,
  w: FLOOR_W * ROOM_CONTENT_SCALE_X,
  h: FLOOR_H * ROOM_CONTENT_SCALE,
};

function hueColor(hue: number, alpha: number): string {
  return `hsla(${hue % 360}, 100%, 60%, ${alpha})`;
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  hue: number,
): void {
  const tipX = x + Math.sin(angle) * length;
  const tipY = y + Math.cos(angle) * length;
  const gradient = ctx.createLinearGradient(x, y, tipX, tipY);
  gradient.addColorStop(0, hueColor(hue, 0.55));
  gradient.addColorStop(1, hueColor(hue, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x + Math.sin(angle - BEAM_HALF_ANGLE) * length,
    y + Math.cos(angle - BEAM_HALF_ANGLE) * length,
  );
  ctx.lineTo(
    x + Math.sin(angle + BEAM_HALF_ANGLE) * length,
    y + Math.cos(angle + BEAM_HALF_ANGLE) * length,
  );
  ctx.closePath();
  ctx.fill();
}

function drawSpot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  hue: number,
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, hueColor(hue, 0.5));
  gradient.addColorStop(1, hueColor(hue, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMirrorBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  now: number,
): void {
  ctx.strokeStyle = "rgba(220, 220, 230, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, room.y);
  ctx.lineTo(x, y - BALL_RADIUS);
  ctx.stroke();

  const body = ctx.createRadialGradient(
    x - BALL_RADIUS * 0.35,
    y - BALL_RADIUS * 0.35,
    BALL_RADIUS * 0.1,
    x,
    y,
    BALL_RADIUS,
  );
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.5, "#b8bcc8");
  body.addColorStop(1, "#5d6270");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // facet grid, its meridians drifting so the ball reads as spinning
  ctx.save();
  ctx.clip();
  const rowH = (BALL_RADIUS * 2) / FACET_ROWS;
  const cycles = now / FACET_STEP_MS;
  const spin = cycles % 1;
  // facets flare as they turn past the light, like mirror tiles catching it
  ctx.globalCompositeOperation = "lighter";
  for (let col = -1; col < FACET_COLUMNS; col++) {
    const id = col - Math.floor(cycles);
    const phase = ((col + spin + 0.5) / FACET_COLUMNS) * Math.PI;
    const facing = Math.cos(phase - LIGHT_PHASE);
    if (facing <= 0) continue;
    const cx = x - Math.cos(phase) * BALL_RADIUS;
    const w = (Math.sin(phase) * BALL_RADIUS * Math.PI) / FACET_COLUMNS;
    for (let row = 0; row < FACET_ROWS; row++) {
      if (hash01(id, row) > LIT_FACET_SHARE) continue;
      const cy = y - BALL_RADIUS + rowH * (row + 0.5);
      ctx.fillStyle = `rgba(255, 255, 255, ${facing ** 6})`;
      ctx.fillRect(cx - w * 0.4, cy - rowH * 0.4, w * 0.8, rowH * 0.8);
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(40, 44, 56, 0.45)";
  ctx.lineWidth = 1.5;
  for (let row = 1; row < FACET_ROWS; row++) {
    const ry = y - BALL_RADIUS + rowH * row;
    ctx.beginPath();
    ctx.moveTo(x - BALL_RADIUS, ry);
    ctx.lineTo(x + BALL_RADIUS, ry);
    ctx.stroke();
  }
  for (let col = 0; col < FACET_COLUMNS; col++) {
    const phase = ((col + spin) / FACET_COLUMNS) * Math.PI;
    const rx = x - Math.cos(phase) * BALL_RADIUS;
    ctx.beginPath();
    ctx.moveTo(rx, y - BALL_RADIUS);
    ctx.lineTo(rx, y + BALL_RADIUS);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // shine twinkles over the outline, each at a fresh spot every time it returns
  for (let i = 0; i < SHINE_COUNT; i++) {
    const shineCycles = now / SHINE_MS + i / SHINE_COUNT;
    const t = shineCycles % 1;
    const n = Math.floor(shineCycles) * SHINE_COUNT + i;
    const angle = hash01(n, 1) * Math.PI * 2;
    // sqrt spreads them evenly over the disc instead of bunching at the center
    const reach = BALL_RADIUS * 0.9 * Math.sqrt(hash01(n, 2));
    drawTwinkle(
      ctx,
      x + Math.cos(angle) * reach,
      y + Math.sin(angle) * reach,
      SHINE_SIZE * Math.sin(Math.PI * t),
      t * Math.PI * 0.5,
    );
  }
}

// the ball's reflected light: flecks on the back wall and floor, sweeping
// sideways with its spin and fading out as they turn away
function drawReflections(
  ctx: CanvasRenderingContext2D,
  ballX: number,
  now: number,
): void {
  const turn = (now / (FACET_STEP_MS * FACET_COLUMNS * 2)) * Math.PI * 2;
  for (let i = 0; i < FLECK_COUNT; i++) {
    const azimuth = hash01(i, 7) * Math.PI * 2 + turn;
    const depth = Math.cos(azimuth);
    if (depth <= 0) continue;
    const fx = ballX + Math.sin(azimuth) * room.w * 0.6;
    const fy = room.y + room.h * (0.08 + 0.88 * hash01(i, 8));
    const radius = 3 + 4 * hash01(i, 9);
    const alpha = depth * 0.8;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.25})`;
    ctx.beginPath();
    ctx.arc(fx, fy, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(fx, fy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// drawn right over the room art, under the walls and workers; ctx is translated
// to the floor's own top-left
export function drawDiscoFloor(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  now: number,
): void {
  if (!floor.unlocked || !hasOnlyPermaWorkers(floor)) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(room.x, room.y, room.w, room.h);
  ctx.clip();

  ctx.fillStyle = `rgba(0, 0, 0, ${DIM_ALPHA})`;
  ctx.fillRect(room.x, room.y, room.w, room.h);

  const ballX = room.x + room.w / 2;
  const ballY = room.y + BALL_DROP;
  const baseHue = now * HUE_SPEED;
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < BEAM_COUNT; i++) {
    const phase = (i / BEAM_COUNT) * Math.PI * 2;
    const angle =
      ((i - (BEAM_COUNT - 1) / 2) / BEAM_COUNT) * 1.4 +
      Math.sin((now / BEAM_PERIOD_MS) * Math.PI * 2 + phase) * BEAM_SWEEP;
    drawBeam(ctx, ballX, ballY, angle, room.h * 1.2, baseHue + i * 90);
  }
  const floorY = room.y + room.h * FLOOR_LINE;
  for (let i = 0; i < SPOT_COUNT; i++) {
    const phase = (i / SPOT_COUNT) * Math.PI * 2;
    const t = Math.sin((now / SPOT_PERIOD_MS) * Math.PI * 2 + phase * 1.7);
    const x = room.x + room.w * (0.5 + 0.42 * t);
    drawSpot(ctx, x, floorY, 120, baseHue + 180 + i * 72);
  }
  drawReflections(ctx, ballX, now);
  ctx.globalCompositeOperation = "source-over";

  drawMirrorBall(ctx, ballX, ballY, now);
  ctx.restore();
}
