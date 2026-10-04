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
// dimmed under a spinning mirror ball scattering white flecks of light

const DIM_ALPHA = 0.5;
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
// every disco floor stamps the same two shared layers: the flecks, redrawn
// once a frame (at FLECK_SCALE), and the ball with its string, redrawn at
// most every BALL_REFRESH_MS (at BALL_SCALE)
const FLECK_SCALE = 0.6;
const FLECK_REFRESH_MS = 8;
const BALL_SCALE = 1.5;
const BALL_HALF = BALL_RADIUS + SHINE_SIZE + 4;
const BALL_REFRESH_MS = 40;

const room = {
  x: SIDE_WALL_WIDTH - ROOM_WALL_OVERLAP_PX,
  y: ROOM_CONTENT_Y_OFFSET,
  w: FLOOR_W * ROOM_CONTENT_SCALE_X,
  h: FLOOR_H * ROOM_CONTENT_SCALE,
};
const ballX = room.x + room.w / 2;
const ballY = room.y + BALL_DROP;

function drawMirrorBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  now: number,
): void {
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
  ctx.fillStyle = "#ffffff";
  for (let col = -1; col < FACET_COLUMNS; col++) {
    const id = col - Math.floor(cycles);
    const phase = ((col + spin + 0.5) / FACET_COLUMNS) * Math.PI;
    const facing = Math.cos(phase - LIGHT_PHASE);
    if (facing <= 0) continue;
    const cx = x - Math.cos(phase) * BALL_RADIUS;
    const w = (Math.sin(phase) * BALL_RADIUS * Math.PI) / FACET_COLUMNS;
    ctx.globalAlpha = facing ** 6;
    for (let row = 0; row < FACET_ROWS; row++) {
      if (hash01(id, row) > LIT_FACET_SHARE) continue;
      const cy = y - BALL_RADIUS + rowH * (row + 0.5);
      ctx.fillRect(cx - w * 0.4, cy - rowH * 0.4, w * 0.8, rowH * 0.8);
    }
  }
  ctx.globalAlpha = 1;
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
function drawReflections(ctx: CanvasRenderingContext2D, now: number): void {
  const turn = (now / (FACET_STEP_MS * FACET_COLUMNS * 2)) * Math.PI * 2;
  const sprite = fleckSprite();
  for (let i = 0; i < FLECK_COUNT; i++) {
    const azimuth = FLECK_AZIMUTH[i] + turn;
    const depth = Math.cos(azimuth);
    if (depth <= 0) continue;
    const halo = FLECK_SIZE[i];
    ctx.globalAlpha = depth * 0.8;
    // whole units: fractional draw args are boxed, dozens a floor a frame
    ctx.drawImage(
      sprite,
      Math.round(ballX + Math.sin(azimuth) * room.w * 0.6 - halo),
      FLECK_Y[i] - halo,
      halo * 2,
      halo * 2,
    );
  }
  ctx.globalAlpha = 1;
}

// a fleck: a bright dot in a faint halo FLECK_HALO times its radius
const FLECK_HALO = 2.2;
// each fleck's fixed spot on the sphere, height on the wall and size
const FLECK_AZIMUTH = Float64Array.from(
  { length: FLECK_COUNT },
  (_, i) => hash01(i, 7) * Math.PI * 2,
);
const FLECK_Y = Int32Array.from({ length: FLECK_COUNT }, (_, i) =>
  Math.round(room.y + room.h * (0.08 + 0.88 * hash01(i, 8))),
);
const FLECK_SIZE = Int32Array.from({ length: FLECK_COUNT }, (_, i) =>
  Math.round((3 + 4 * hash01(i, 9)) * FLECK_HALO),
);
const FLECK_SPRITE_HALF = 16;
let fleckCanvas: HTMLCanvasElement | null = null;
function fleckSprite(): HTMLCanvasElement {
  if (fleckCanvas) return fleckCanvas;
  fleckCanvas = document.createElement("canvas");
  fleckCanvas.width = fleckCanvas.height = FLECK_SPRITE_HALF * 2;
  const ctx = fleckCanvas.getContext("2d")!;
  const c = FLECK_SPRITE_HALF;
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(c, c, c / FLECK_HALO, 0, Math.PI * 2);
  ctx.fill();
  return fleckCanvas;
}

// drawn right over the room art, under the walls and workers; ctx is translated
// to the floor's own top-left. Three stamps a floor: the dim, the flecks and
// the ball, the last two shared by every disco floor
export function drawDiscoFloor(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  now: number,
): void {
  if (!floor.unlocked || !hasOnlyPermaWorkers(floor)) return;
  const flecks = refreshFlecks(now);
  const ball = refreshBall(now);
  ctx.fillStyle = DIM;
  ctx.fillRect(room.x, room.y, room.w, room.h);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(flecks, room.x, room.y, room.w, room.h);
  ctx.globalCompositeOperation = previous;
  ctx.drawImage(
    ball,
    ballX - BALL_HALF,
    ballY - BALL_HALF,
    BALL_HALF * 2,
    BALL_HALF * 2,
  );
}

const DIM = `rgba(0, 0, 0, ${DIM_ALPHA})`;
const STRING = "rgba(220, 220, 230, 0.8)";
let fleckLayer: HTMLCanvasElement | null = null;
let flecksAt = -Infinity;

// the room's flecks of light, redrawn once a frame for every disco floor
function refreshFlecks(now: number): HTMLCanvasElement {
  if (!fleckLayer) {
    fleckLayer = document.createElement("canvas");
    fleckLayer.width = Math.ceil(room.w * FLECK_SCALE);
    fleckLayer.height = Math.ceil(room.h * FLECK_SCALE);
  }
  if (now >= flecksAt && now - flecksAt < FLECK_REFRESH_MS) return fleckLayer;
  flecksAt = now;
  const c = fleckLayer.getContext("2d")!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, fleckLayer.width, fleckLayer.height);
  c.setTransform(
    FLECK_SCALE,
    0,
    0,
    FLECK_SCALE,
    -room.x * FLECK_SCALE,
    -room.y * FLECK_SCALE,
  );
  drawReflections(c, now);
  return fleckLayer;
}

let ballLayer: HTMLCanvasElement | null = null;
let refreshedAt = -Infinity;

// the spinning ball and its string, shared by every disco floor and redrawn a
// few dozen times a second rather than once per floor per frame
function refreshBall(now: number): HTMLCanvasElement {
  if (!ballLayer) {
    ballLayer = document.createElement("canvas");
    ballLayer.width = ballLayer.height = Math.ceil(BALL_HALF * 2 * BALL_SCALE);
  }
  if (now >= refreshedAt && now - refreshedAt < BALL_REFRESH_MS)
    return ballLayer;
  refreshedAt = now;
  const ball = ballLayer.getContext("2d")!;
  ball.setTransform(1, 0, 0, 1, 0, 0);
  ball.clearRect(0, 0, ballLayer.width, ballLayer.height);
  ball.setTransform(
    BALL_SCALE,
    0,
    0,
    BALL_SCALE,
    (BALL_HALF - ballX) * BALL_SCALE,
    (BALL_HALF - ballY) * BALL_SCALE,
  );
  ball.strokeStyle = STRING;
  ball.lineWidth = 2;
  ball.beginPath();
  ball.moveTo(ballX, room.y);
  ball.lineTo(ballX, ballY - BALL_RADIUS);
  ball.stroke();
  drawMirrorBall(ball, ballX, ballY, now);
  return ballLayer;
}
