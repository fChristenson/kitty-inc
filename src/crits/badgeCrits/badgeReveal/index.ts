// a badge reveal, played on a reveal stage: a badge floats over a pool of
// light. A wisp swoops in and bumps it on the head, setting it spinning like a
// cartoon until it flips to its new face, which spins on, overshoots and turns
// back to settle facing front. The Reveal event flips a silhouette to the art;
// a badge reaching a new foil flips to its shimmering or glittering self
import { CONFIG } from "../../../config";
import { COLOR } from "../../../palette";
import {
  playBloop,
  playJackpot,
  playSwoosh,
  startBoostEventStreamLoop,
} from "../../../sound";
import { shakeScreen } from "../../critFlash";
import type { BadgeFoil } from "../critProcCounts";
import { critFont, drawPoppingCritText } from "../../critFlash/critText";
import { drawWhiteBurst } from "../../../shared/eventFx";
import { drawWisp, swoop, WISP_SIZE } from "../../../shared/wisp";
import {
  fadeStops,
  glowSprite,
  type FadeStops,
} from "../../../shared/glowSprite";
import { stampGlimmer } from "../../../shared/twinkle";
import { clamp01, easeOutBack } from "../../../shared/easing";

type Art = HTMLImageElement | HTMLCanvasElement;

// one face of the badge: its art, with the foil sweep and glints baked for it
export interface BadgeFace {
  art: Art;
  shine: HTMLCanvasElement | null;
  glints: Glint[] | null;
}

export interface BadgeScene {
  before: BadgeFace | null;
  after: BadgeFace | null;
  title: string;
}

// the stage's rect in the canvas's world space
export interface BadgeStage {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Glint {
  x: number; // of the art's width
  y: number; // of its height
  phase: number;
  color: string;
}

type Point = { x: number; y: number };
type Timeline = ReturnType<typeof badgeRevealTimeline>;

// the badge's longest side, of the stage's shorter side
const BADGE_SHARE = 0.55;
// the spin round its upright axis: it spins up until edge-on, flips to the
// new face, spins on past facing front by OVERSHOOT radians and turns back
const SPIN_UP_ANGLE = Math.PI * 3.5;
const FRONT = Math.PI * 6;
const OVERSHOOT = 0.6;
const DECEL_ANGLE = FRONT + OVERSHOOT - SPIN_UP_ANGLE;
const GHOSTS = 2;
const GHOST_MS = 25;
// the bump: the share of it spent dipping onto the head, and the squash it leaves
const CONTACT = 0.45;
const SQUASH = 0.18;
const ORB_SIZE = WISP_SIZE;
const OFF_SCREEN = 120;
const HOVER_RISE = 110;
const PERCH_MS = 500;
const BOB = 7;
const BADGE_BOB = 6;
// the light pool under the badge and the badge's shadow in it
const POOL = 0.75;
// how far out each stays solid before its short soft edge
const POOL_SOLID = 0.8;
const SHADOW_SOLID = 0.7;
// the gap between the badge and its light pool, of its size
const HOVER_GAP = 0.15;
const POOL_SQUASH = 0.25;
const SHADOW = 0.32;
const BURST_MS = 500;
const POP_MS = 450;
const POP = 0.25;
const TITLE_FONT = 72;
// the title spans this share of the stage's width
const TITLE_WIDTH = 0.6;
const TEXT_GAP = 60;
const TITLE_RISE = 1.25;
const SHAKE = 0.6;

// the foil: the same rainbow band the badge collection's stickers sweep with
// (hex, as shared/twinkle appends alpha digits to its colors)
const FOIL_COLORS = ["#ff3caa", "#ffe13c", "#3cffc8", "#468cff"];
const SHINE_FRAMES = 16;
const SHINE_COLS = 4;
const SHINE_CELL = 256;
const SHINE_PASS_MS = 650;
const SHINE_EVERY_MS = 1400;
const GLINTS = 14;
const GLINT_MS = 1100;
// a glint at its brightest, of the art's longest side
const GLINT_SIZE = 0.07;
// the alpha grid glints are picked from
const GLINT_GRID = 32;

// when each beat starts, in ms from the stage being fully in
export function badgeRevealTimeline() {
  const { flyMs, hoverMs, bumpMs, spinUpMs, correctMs, holdMs } =
    CONFIG.revealEvent;
  const bumpAt = flyMs + hoverMs;
  const spinAt = bumpAt + bumpMs * CONTACT;
  const swapAt = spinAt + spinUpMs;
  // the residual spins start as fast as the spin-up ended
  const decelMs = (3 * DECEL_ANGLE * spinUpMs) / (2 * SPIN_UP_ANGLE);
  const settleAt = swapAt + decelMs;
  const restAt = settleAt + correctMs;
  return {
    bumpAt,
    spinAt,
    swapAt,
    decelMs,
    settleAt,
    restAt,
    durationMs: restAt + holdMs,
  };
}

// the reveal's sounds and shake on its stage's beats
export function playBadgeRevealBeats(
  beat: (ms: number, fn: () => void) => void,
): void {
  const tl = badgeRevealTimeline();
  let stopSound: (() => void) | null = null;
  beat(0, playSwoosh);
  beat(tl.spinAt, () => {
    playBloop();
    stopSound = startBoostEventStreamLoop();
  });
  beat(tl.swapAt, () => {
    playJackpot();
    shakeScreen(SHAKE);
  });
  beat(tl.settleAt, () => stopSound?.());
}

// the art's shape filled flat black
export function silhouetteOf(art: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = art.naturalWidth;
  canvas.height = art.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(art, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = COLOR.black;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

// a face for `art`, its foil baked once here, never per frame
export function badgeFace(art: Art, foil: BadgeFoil | null = null): BadgeFace {
  return {
    art,
    shine: foil ? bakeShine(art) : null,
    glints: foil === "glitter" ? pickGlints(art) : null,
  };
}

// the rainbow band at SHINE_FRAMES spots across the art, each cut to its shape
function bakeShine(art: Art): HTMLCanvasElement {
  const fit = SHINE_CELL / Math.max(art.width, art.height);
  const w = Math.max(1, Math.round(art.width * fit));
  const h = Math.max(1, Math.round(art.height * fit));
  const atlas = document.createElement("canvas");
  atlas.width = w * SHINE_COLS;
  atlas.height = h * Math.ceil(SHINE_FRAMES / SHINE_COLS);
  const atlasCtx = atlas.getContext("2d")!;
  const frame = document.createElement("canvas");
  frame.width = w;
  frame.height = h;
  const c = frame.getContext("2d")!;
  // the band runs corner to corner, tilted like the stickers' 110deg sweep
  const span = w + h;
  for (let k = 0; k < SHINE_FRAMES; k++) {
    const at = -0.3 * span + (1.6 * span * k) / (SHINE_FRAMES - 1);
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, w, h);
    const band = c.createLinearGradient(at - h * 0.4, 0, at + h * 0.4, h * 0.3);
    band.addColorStop(0, "rgb(255 255 255 / 0)");
    FOIL_COLORS.forEach((color, i) =>
      band.addColorStop(0.2 + (0.6 * i) / (FOIL_COLORS.length - 1), color),
    );
    band.addColorStop(1, "rgb(255 255 255 / 0)");
    c.fillStyle = band;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "destination-in";
    c.drawImage(art, 0, 0, w, h);
    atlasCtx.drawImage(
      frame,
      (k % SHINE_COLS) * w,
      Math.floor(k / SHINE_COLS) * h,
    );
  }
  return atlas;
}

// glints scattered over the art's solid pixels
function pickGlints(art: Art): Glint[] {
  const grid = document.createElement("canvas");
  grid.width = GLINT_GRID;
  grid.height = GLINT_GRID;
  const c = grid.getContext("2d", { willReadFrequently: true })!;
  c.drawImage(art, 0, 0, GLINT_GRID, GLINT_GRID);
  const { data } = c.getImageData(0, 0, GLINT_GRID, GLINT_GRID);
  const solid: number[] = [];
  for (let i = 0; i < GLINT_GRID * GLINT_GRID; i++)
    if (data[i * 4 + 3] > 200) solid.push(i);
  const glints: Glint[] = [];
  for (let i = 0; i < GLINTS && solid.length > 0; i++) {
    const cell = solid[Math.floor(Math.random() * solid.length)];
    glints.push({
      x: ((cell % GLINT_GRID) + Math.random()) / GLINT_GRID,
      y: (Math.floor(cell / GLINT_GRID) + Math.random()) / GLINT_GRID,
      phase: Math.random(),
      color: FOIL_COLORS[i % FOIL_COLORS.length],
    });
  }
  return glints;
}

function spinAngle(ms: number, tl: Timeline): number {
  const { spinUpMs, correctMs } = CONFIG.revealEvent;
  if (ms < tl.spinAt) return 0;
  if (ms < tl.swapAt) return SPIN_UP_ANGLE * ((ms - tl.spinAt) / spinUpMs) ** 2;
  if (ms < tl.settleAt)
    return (
      SPIN_UP_ANGLE +
      DECEL_ANGLE * (1 - (1 - (ms - tl.swapAt) / tl.decelMs) ** 3)
    );
  const u = clamp01((ms - tl.settleAt) / correctMs);
  return FRONT + OVERSHOOT * Math.exp(-4 * u) * Math.cos(2.5 * Math.PI * u);
}

// the wisp: swooping in from off the left, hovering over the badge, dipping
// to bump its head, then floating up to a perch beside it; null before it enters
function wispAt(
  ms: number,
  tl: Timeline,
  stage: BadgeStage,
  cx: number,
  headY: number,
  size: number,
): Point | null {
  const { flyMs, bumpMs } = CONFIG.revealEvent;
  if (ms < 0) return null;
  const hover = { x: cx, y: headY - HOVER_RISE };
  let bobShare = 1;
  let at: Point;
  if (ms < flyMs)
    at = swoop(
      { x: stage.x - OFF_SCREEN, y: stage.y + HOVER_RISE },
      hover,
      ms / flyMs,
      3,
      0.3,
      1.5,
      30,
    );
  else if (ms < tl.bumpAt) at = hover;
  else if (ms < tl.bumpAt + bumpMs) {
    const u = (ms - tl.bumpAt) / bumpMs;
    const contactY = headY - ORB_SIZE * 0.6;
    const dip =
      u < CONTACT
        ? (u / CONTACT) ** 2
        : 1 - easeOutBack((u - CONTACT) / (1 - CONTACT));
    at = { x: hover.x, y: hover.y + (contactY - hover.y) * dip };
    bobShare = 1 - Math.sin(Math.PI * u);
  } else {
    const perch = { x: cx + size * 0.5, y: headY - HOVER_RISE * 0.6 };
    at = swoop(
      hover,
      perch,
      clamp01((ms - tl.bumpAt - bumpMs) / PERCH_MS),
      5,
      0.4,
      1,
      14,
    );
  }
  return {
    x: at.x + Math.cos(ms / 260) * BOB * bobShare,
    y: at.y + Math.sin(ms / 190) * BOB * bobShare,
  };
}

// a pool of light on the floor under the badge, with the badge's small shadow
// in it; shadowScale narrows the shadow as the badge spins or lifts, shadowX
// moves it along with something rolling
export function drawBadgeSpotlight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  floorY: number,
  size: number,
  strength: number,
  shadowScale: number,
  shadowX = 0,
): void {
  ctx.save();
  ctx.translate(cx, floorY);
  ctx.scale(1, POOL_SQUASH);
  const pool = size * POOL;
  ctx.globalAlpha = Math.min(1, 0.6 * strength);
  ctx.drawImage(
    fadeSprite(COLOR.white, POOL_SOLID),
    -pool,
    -pool,
    pool * 2,
    pool * 2,
  );
  ctx.translate(shadowX, 0);
  ctx.scale(shadowScale, 1);
  const shadow = size * SHADOW;
  ctx.globalAlpha = 0.5;
  ctx.drawImage(
    fadeSprite(COLOR.black, SHADOW_SOLID),
    -shadow,
    -shadow,
    shadow * 2,
    shadow * 2,
  );
  ctx.restore();
}

// a soft round fade, drawn once per color and stamped every frame
const fadeSprite = (color: string, solid: number) =>
  glowSprite(fadeStopsOf(color, solid));
const fadeCache = new Map<string, FadeStops>();
function fadeStopsOf(color: string, solid: number): FadeStops {
  const key = `${color}|${solid}`;
  let stops = fadeCache.get(key);
  if (!stops) fadeCache.set(key, (stops = fadeStops(color, solid)));
  return stops;
}

// its fitted width and height inside a size x size box
export function fitBadge(image: Art | null | undefined, size: number) {
  if (!image) return { w: size, h: size };
  const fit = size / Math.max(image.width, image.height);
  return { w: image.width * fit, h: image.height * fit };
}

// the face's foil over its art, in the art's box (-w/2, -h)..(w/2, 0);
// faceMs runs from when this face first showed
function drawFoil(
  ctx: CanvasRenderingContext2D,
  face: BadgeFace,
  w: number,
  h: number,
  faceMs: number,
): void {
  if (face.shine) {
    const pass = clamp01((faceMs % SHINE_EVERY_MS) / SHINE_PASS_MS);
    if (pass > 0 && pass < 1) {
      const k = Math.round(pass * (SHINE_FRAMES - 1));
      const cw = face.shine.width / SHINE_COLS;
      const ch = face.shine.height / Math.ceil(SHINE_FRAMES / SHINE_COLS);
      ctx.globalCompositeOperation = "color-dodge";
      ctx.drawImage(
        face.shine,
        (k % SHINE_COLS) * cw,
        Math.floor(k / SHINE_COLS) * ch,
        cw,
        ch,
        -w / 2,
        -h,
        w,
        h,
      );
    }
  }
  if (face.glints) {
    ctx.globalCompositeOperation = "lighter";
    const most = Math.max(w, h) * GLINT_SIZE;
    for (const glint of face.glints) {
      const u = (faceMs / GLINT_MS + glint.phase) % 1;
      // in and out over the first half of its cycle, dark the rest
      if (u >= 0.5) continue;
      const size = most * Math.sin(u * 2 * Math.PI) ** 2;
      stampGlimmer(
        ctx,
        -w / 2 + glint.x * w,
        -h + glint.y * h,
        size,
        u * Math.PI,
        glint.color,
      );
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

// standing on (x, bottom), spun `angle` round its upright axis and squashed
function drawSpunBadge(
  ctx: CanvasRenderingContext2D,
  face: BadgeFace,
  x: number,
  bottom: number,
  size: number,
  angle: number,
  squash: number,
  faceMs: number | null,
): void {
  const { w, h } = fitBadge(face.art, size);
  ctx.save();
  ctx.translate(x, bottom);
  ctx.scale(Math.cos(angle) * (1 + squash), 1 - squash);
  ctx.drawImage(face.art, -w / 2, -h, w, h);
  if (faceMs !== null) drawFoil(ctx, face, w, h, faceMs);
  ctx.restore();
}

// the badge reveal `ms` after the stage is fully in
export function drawBadgeReveal(
  ctx: CanvasRenderingContext2D,
  stage: BadgeStage,
  scene: BadgeScene,
  ms: number,
  now: number,
): void {
  const tl = badgeRevealTimeline();
  const size = Math.min(stage.w, stage.h) * BADGE_SHARE;
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const swapped = ms >= tl.swapAt;
  const halfH =
    fitBadge((swapped ? scene.after : scene.before)?.art, size).h / 2;
  // the floor it hovers over; once settled it bobs higher still
  const floorY = cy + halfH + size * HOVER_GAP;
  const lift =
    ms > tl.restAt ? (1 - Math.cos((ms - tl.restAt) / 420)) * BADGE_BOB : 0;
  const by = cy - lift;
  const angle = spinAngle(ms, tl);
  const flash = swapped ? Math.max(0, 1 - (ms - tl.swapAt) / POP_MS) : 0;
  drawBadgeSpotlight(
    ctx,
    cx,
    floorY,
    size,
    (swapped ? 1 : 0.7) + 0.5 * flash,
    Math.max(0.35, Math.abs(Math.cos(angle))) * (1 - lift / (BADGE_BOB * 4)),
  );

  const sinceBump = ms - tl.spinAt;
  const squash =
    sinceBump >= 0
      ? SQUASH * Math.exp(-sinceBump / 110) * Math.cos(sinceBump / 55)
      : 0;
  const pop = 1 + POP * flash;
  const faceAt = (t: number) => (t >= tl.swapAt ? scene.after : scene.before);
  const bottom = by + halfH;
  if (ms > tl.spinAt && ms < tl.settleAt)
    // faint copies trailing the fast spin
    for (let k = GHOSTS; k >= 1; k--) {
      const t = ms - k * GHOST_MS;
      const face = faceAt(t);
      if (!face) continue;
      ctx.globalAlpha = 0.3 / k;
      drawSpunBadge(
        ctx,
        face,
        cx,
        bottom,
        size * pop,
        spinAngle(t, tl),
        0,
        null,
      );
    }
  ctx.globalAlpha = 1;
  const face = faceAt(ms);
  if (face)
    drawSpunBadge(
      ctx,
      face,
      cx,
      bottom,
      size * pop,
      angle,
      squash,
      swapped ? ms - tl.swapAt : ms,
    );

  drawWisp(
    ctx,
    (t) => wispAt(t, tl, stage, cx, by - halfH, size),
    ms,
    now,
    ORB_SIZE,
  );

  if (swapped) drawWhiteBurst(ctx, cx, by, (ms - tl.swapAt) / BURST_MS, 0.7);
  if (ms >= tl.settleAt)
    drawBadgeTitle(
      ctx,
      stage,
      scene.title,
      cx,
      by,
      size / 2,
      now - (ms - tl.settleAt),
      now,
    );
}

// a reveal's title popping in over a badge centred at (cx, cy)
export function drawBadgeTitle(
  ctx: CanvasRenderingContext2D,
  stage: BadgeStage,
  title: string,
  cx: number,
  cy: number,
  halfSize: number,
  poppedAt: number,
  now: number,
): void {
  ctx.font = critFont(TITLE_FONT);
  const titleFont =
    (TITLE_FONT * stage.w * TITLE_WIDTH) / ctx.measureText(title).width;
  drawPoppingCritText(
    ctx,
    title,
    cx,
    // its bottom stays put as it grows, but never past the stage's top
    Math.max(
      stage.y + titleFont * 0.75,
      cy - (halfSize + TEXT_GAP) * TITLE_RISE - (titleFont - TITLE_FONT) / 2,
    ),
    COLOR.heavenlyGold,
    poppedAt,
    now,
    { fontSize: titleFont, strokeWidth: (10 * titleFont) / TITLE_FONT },
  );
}
