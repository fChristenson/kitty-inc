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
// the soft lights are sprites per hue step (at LIGHT_SCALE) stamped straight
// onto each disco floor; the ball is redrawn into one shared layer (at
// BALL_SCALE) at most every BALL_REFRESH_MS and stamped too
const LIGHT_SCALE = 0.35;
const HUE_STEPS = 36;
const SPOT_RADIUS = 120;
const BALL_SCALE = 1.5;
const BALL_HALF = BALL_RADIUS + SHINE_SIZE + 4;
const BALL_REFRESH_MS = 40;

const room = {
  x: SIDE_WALL_WIDTH - ROOM_WALL_OVERLAP_PX,
  y: ROOM_CONTENT_Y_OFFSET,
  w: FLOOR_W * ROOM_CONTENT_SCALE_X,
  h: FLOOR_H * ROOM_CONTENT_SCALE,
};
const beamLength = room.h * 1.2;
const beamHalfW = Math.sin(BEAM_HALF_ANGLE) * beamLength;

function hueColor(hue: number, alpha: number): string {
  return `hsla(${hue % 360}, 100%, 60%, ${alpha})`;
}

function hueStep(hue: number): number {
  return Math.round(((hue % 360) + 360) / (360 / HUE_STEPS)) % HUE_STEPS;
}

function lightCanvas(w: number, h: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w * LIGHT_SCALE));
  canvas.height = Math.max(1, Math.ceil(h * LIGHT_SCALE));
  const c = canvas.getContext("2d")!;
  c.scale(LIGHT_SCALE, LIGHT_SCALE);
  return c;
}

// a beam fanning down from its apex at the top middle, fading along its length
const beamSprites: HTMLCanvasElement[] = [];
function beamSprite(step: number): HTMLCanvasElement {
  let sprite = beamSprites[step];
  if (sprite) return sprite;
  const c = lightCanvas(beamHalfW * 2, beamLength);
  const hue = (step * 360) / HUE_STEPS;
  const gradient = c.createLinearGradient(0, 0, 0, beamLength);
  gradient.addColorStop(0, hueColor(hue, 0.55));
  gradient.addColorStop(1, hueColor(hue, 0));
  c.fillStyle = gradient;
  c.beginPath();
  c.moveTo(beamHalfW, 0);
  c.lineTo(0, Math.cos(BEAM_HALF_ANGLE) * beamLength);
  c.lineTo(beamHalfW * 2, Math.cos(BEAM_HALF_ANGLE) * beamLength);
  c.closePath();
  c.fill();
  return (beamSprites[step] = c.canvas);
}

// a round glow, squashed into a floor spot when stamped
const spotSprites: HTMLCanvasElement[] = [];
function spotSprite(step: number): HTMLCanvasElement {
  let sprite = spotSprites[step];
  if (sprite) return sprite;
  const c = lightCanvas(SPOT_RADIUS * 2, SPOT_RADIUS * 2);
  const hue = (step * 360) / HUE_STEPS;
  const gradient = c.createRadialGradient(
    SPOT_RADIUS,
    SPOT_RADIUS,
    0,
    SPOT_RADIUS,
    SPOT_RADIUS,
    SPOT_RADIUS,
  );
  gradient.addColorStop(0, hueColor(hue, 0.5));
  gradient.addColorStop(1, hueColor(hue, 0));
  c.fillStyle = gradient;
  c.fillRect(0, 0, SPOT_RADIUS * 2, SPOT_RADIUS * 2);
  return (spotSprites[step] = c.canvas);
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  hue: number,
): void {
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.drawImage(
    beamSprite(hueStep(hue)),
    -beamHalfW,
    0,
    beamHalfW * 2,
    beamLength,
  );
  ctx.rotate(angle);
  ctx.translate(-x, -y);
}

function drawSpot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hue: number,
): void {
  ctx.drawImage(
    spotSprite(hueStep(hue)),
    x - SPOT_RADIUS,
    y - SPOT_RADIUS * 0.3,
    SPOT_RADIUS * 2,
    SPOT_RADIUS * 0.6,
  );
}

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
function drawReflections(
  ctx: CanvasRenderingContext2D,
  ballX: number,
  now: number,
): void {
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
// to the floor's own top-left
export function drawDiscoFloor(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  now: number,
): void {
  if (!floor.unlocked || !hasOnlyPermaWorkers(floor)) return;
  const ball = refreshBall(now);
  const ballX = room.x + room.w / 2;
  const ballY = room.y + BALL_DROP;
  ctx.save();
  ctx.beginPath();
  ctx.rect(room.x, room.y, room.w, room.h);
  ctx.clip();
  ctx.fillStyle = DIM;
  ctx.fillRect(room.x, room.y, room.w, room.h);
  ctx.globalCompositeOperation = "lighter";
  const baseHue = now * HUE_SPEED;
  for (let i = 0; i < BEAM_COUNT; i++) {
    const phase = (i / BEAM_COUNT) * Math.PI * 2;
    const angle =
      ((i - (BEAM_COUNT - 1) / 2) / BEAM_COUNT) * 1.4 +
      Math.sin((now / BEAM_PERIOD_MS) * Math.PI * 2 + phase) * BEAM_SWEEP;
    drawBeam(ctx, ballX, ballY, angle, baseHue + i * 90);
  }
  const floorY = room.y + room.h * FLOOR_LINE;
  for (let i = 0; i < SPOT_COUNT; i++) {
    const phase = (i / SPOT_COUNT) * Math.PI * 2;
    const t = Math.sin((now / SPOT_PERIOD_MS) * Math.PI * 2 + phase * 1.7);
    drawSpot(
      ctx,
      room.x + room.w * (0.5 + 0.42 * t),
      floorY,
      baseHue + 180 + i * 72,
    );
  }
  drawReflections(ctx, ballX, now);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = STRING;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ballX, room.y);
  ctx.lineTo(ballX, ballY - BALL_RADIUS);
  ctx.stroke();
  ctx.drawImage(
    ball,
    ballX - BALL_HALF,
    ballY - BALL_HALF,
    BALL_HALF * 2,
    BALL_HALF * 2,
  );
  ctx.restore();
}

const DIM = `rgba(0, 0, 0, ${DIM_ALPHA})`;
const STRING = "rgba(220, 220, 230, 0.8)";
let ballLayer: HTMLCanvasElement | null = null;
let refreshedAt = -Infinity;

// the spinning ball, shared by every disco floor and redrawn a few dozen
// times a second rather than once per floor per frame
function refreshBall(now: number): HTMLCanvasElement {
  if (!ballLayer) {
    ballLayer = document.createElement("canvas");
    ballLayer.width = ballLayer.height = Math.ceil(BALL_HALF * 2 * BALL_SCALE);
  }
  if (now >= refreshedAt && now - refreshedAt < BALL_REFRESH_MS)
    return ballLayer;
  refreshedAt = now;
  const ballX = room.x + room.w / 2;
  const ballY = room.y + BALL_DROP;
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
  drawMirrorBall(ball, ballX, ballY, now);
  return ballLayer;
}
