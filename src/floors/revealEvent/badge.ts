// the Reveal event's reveal, played on the shared reveal stage: a badge's black
// silhouette floats over a pool of light. A wisp swoops in and bumps it on the
// head, setting it spinning like a cartoon until it flips to the badge's art,
// which spins on, overshoots and turns back to settle facing front
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { critFont, drawPoppingCritText } from "../../shared/critText";
import { drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, swoop, WISP_SIZE } from "../../shared/wisp";
import { fadeStops, glowSprite, type FadeStops } from "../../shared/glowSprite";
import type { StageRect } from "../revealStage";
import { clamp01, easeOutBack } from "../../shared/easing";

type Art = HTMLImageElement | HTMLCanvasElement;

export interface BadgeScene {
  silhouette: Art | null;
  art: Art | null;
  title: string;
}

type Point = { x: number; y: number };
type Timeline = ReturnType<typeof badgeRevealTimeline>;

// the badge's longest side, of the stage's shorter side
const BADGE_SHARE = 0.55;
// the spin round its upright axis: it spins up until edge-on, flips to the
// art, spins on past facing front by OVERSHOOT radians and turns back
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
  stage: StageRect,
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
// in it; shadowScale narrows the shadow as the badge spins or lifts
function drawSpotlight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  floorY: number,
  size: number,
  strength: number,
  shadowScale: number,
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

// its fitted width and height inside a size x size box
function fitted(image: Art | null, size: number) {
  if (!image) return { w: size, h: size };
  const fit = size / Math.max(image.width, image.height);
  return { w: image.width * fit, h: image.height * fit };
}

// standing on (x, bottom), spun `angle` round its upright axis and squashed
function drawSpunBadge(
  ctx: CanvasRenderingContext2D,
  image: Art,
  x: number,
  bottom: number,
  size: number,
  angle: number,
  squash: number,
): void {
  const { w, h } = fitted(image, size);
  ctx.save();
  ctx.translate(x, bottom);
  ctx.scale(Math.cos(angle) * (1 + squash), 1 - squash);
  ctx.drawImage(image, -w / 2, -h, w, h);
  ctx.restore();
}

// the badge reveal `ms` after the stage is fully in
export function drawBadgeReveal(
  ctx: CanvasRenderingContext2D,
  stage: StageRect,
  scene: BadgeScene,
  ms: number,
  now: number,
): void {
  const tl = badgeRevealTimeline();
  const size = Math.min(stage.w, stage.h) * BADGE_SHARE;
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const swapped = ms >= tl.swapAt;
  const halfH = fitted(swapped ? scene.art : scene.silhouette, size).h / 2;
  // the floor it hovers over; once settled it bobs higher still
  const floorY = cy + halfH + size * HOVER_GAP;
  const lift =
    ms > tl.restAt ? (1 - Math.cos((ms - tl.restAt) / 420)) * BADGE_BOB : 0;
  const by = cy - lift;
  const angle = spinAngle(ms, tl);
  const flash = swapped ? Math.max(0, 1 - (ms - tl.swapAt) / POP_MS) : 0;
  drawSpotlight(
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
  const imageAt = (t: number) =>
    t >= tl.swapAt ? scene.art : scene.silhouette;
  const bottom = by + halfH;
  if (ms > tl.spinAt && ms < tl.settleAt)
    // faint copies trailing the fast spin
    for (let k = GHOSTS; k >= 1; k--) {
      const t = ms - k * GHOST_MS;
      const image = imageAt(t);
      if (!image) continue;
      ctx.globalAlpha = 0.3 / k;
      drawSpunBadge(ctx, image, cx, bottom, size * pop, spinAngle(t, tl), 0);
    }
  ctx.globalAlpha = 1;
  const image = imageAt(ms);
  if (image) drawSpunBadge(ctx, image, cx, bottom, size * pop, angle, squash);

  drawWisp(
    ctx,
    (t) => wispAt(t, tl, stage, cx, by - halfH, size),
    ms,
    now,
    ORB_SIZE,
  );

  if (swapped) drawWhiteBurst(ctx, cx, by, (ms - tl.swapAt) / BURST_MS, 0.7);
  if (ms >= tl.settleAt) {
    const poppedAt = now - (ms - tl.settleAt);
    ctx.font = critFont(TITLE_FONT);
    const titleFont =
      (TITLE_FONT * stage.w * TITLE_WIDTH) / ctx.measureText(scene.title).width;
    drawPoppingCritText(
      ctx,
      scene.title,
      cx,
      // its bottom stays put as it grows
      by - (size / 2 + TEXT_GAP) * TITLE_RISE - (titleFont - TITLE_FONT) / 2,
      COLOR.heavenlyGold,
      poppedAt,
      now,
      { fontSize: titleFont, strokeWidth: (10 * titleFont) / TITLE_FONT },
    );
  }
}
