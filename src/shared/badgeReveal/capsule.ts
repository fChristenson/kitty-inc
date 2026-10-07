// the mystery badge capsule reveal, played on a reveal stage: a gacha capsule,
// half gold and half white, drops onto a pool of light and rolls back and
// forth along the ground. A wisp taps the seam between its halves; it wobbles
// like jelly and swells, then the halves pop open to either side in a flash
// of glitter as the badge pops out
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playJackpot, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawExplosion } from "../eventFx";
import { drawWisp, swoop, WISP_SIZE } from "../wisp";
import { clamp01, easeIn, easeOutBack } from "../easing";
import {
  drawBadgeSpotlight,
  drawBadgeTitle,
  fitBadge,
  type BadgeStage,
} from ".";

type Art = HTMLImageElement | HTMLCanvasElement;
type Point = { x: number; y: number };

export interface CapsuleScene {
  art: Art | null;
  title: string;
}

// the capsule's diameter and the badge's longest side, of the stage's shorter side
const CAPSULE_SHARE = 0.22;
const BADGE_SHARE = 0.5;
// how far the badge rises out of the capsule, of its size
const BADGE_RISE = 0.15;
const DROP_HEIGHT = 0.45; // of the stage's height
const ROLL_ANGLE = Math.PI / 6;
const LAND_SQUASH = 0.16;
const LAND_SQUASH_MS = 160;
const HIT_SHAKE = 0.9;
// the tap's jelly wobble (of its size), its half-waves, and the swell before it bursts
const WARP_WOBBLE = 0.22;
const WARP_WAVES = 5;
const WARP_SWELL = 0.18;
const OFF_SCREEN = 120;
const HOVER_RISE = 110;
const BOB = 7;
const AWAY_MS = 500;
// the halves popped apart by the burst: out to either side, tumbling outward
const HALF_FLY_MS = 550;
const HALF_SPIN = 1.6;
const HALF_THROW = 1.4; // of the capsule's diameter, sideways
const HALF_ARC = 0.9; // up before they fall, of its diameter
const BURST_SCALE = 0.9;
const SPARK_SIZE = 22;
// the capsule sprite's radius in px, and of that its ink outline, the band
// down its seam and the button on the band
const SPRITE_R = 128;
const OUTLINE = 0.085;
const BAND = 0.11;
const BUTTON = 0.36;
const BUTTON_FACE = 0.25;
// cel shading: each half's lit disc, offset up left, leaving a dark crescent
const LIT_SHIFT = 0.13;
const LIT_R = 0.93;
const INK = "#16100a";
const GOLD_SHADE = "#D9922A";
const WHITE_SHADE = "#CDD4E4";
const BUTTON_SHADE = "#BAC3D6";
const BUTTON_FACE_COLOR = "#F4F6FB";

// when each beat starts, in ms from the stage being fully in
export function capsuleRevealTimeline() {
  const { dropMs, rolls, rollMs, diveMs, warpMs, growMs, holdMs } =
    CONFIG.badgeCapsule;
  const rollFrom = dropMs;
  // a beat each time it swings out to a side
  const swingAt = Array.from(
    { length: rolls * 2 },
    (_, i) => rollFrom + ((i + 0.5) * rollMs) / 2,
  );
  const diveAt = rollFrom + rolls * rollMs;
  const tapAt = diveAt + diveMs;
  const hitAt = tapAt + warpMs;
  return {
    rollFrom,
    swingAt,
    diveAt,
    tapAt,
    hitAt,
    settleAt: hitAt + growMs,
    durationMs: hitAt + growMs + holdMs,
  };
}
type Timeline = ReturnType<typeof capsuleRevealTimeline>;

// the reveal's sounds and shakes on its stage's beats
export function playCapsuleRevealBeats(
  beat: (ms: number, fn: () => void) => void,
): void {
  const tl = capsuleRevealTimeline();
  beat(0, playSwoosh);
  for (const at of tl.swingAt) beat(at, playBloop);
  beat(tl.tapAt, playBloop);
  beat(tl.hitAt, () => {
    playJackpot();
    shakeScreen(HIT_SHAKE);
  });
}

// the capsule's squash and stretch after the tap, as x and y scales: a
// jelly wobble dying off as it swells up ready to burst
function warpAt(ms: number, tl: Timeline): { sx: number; sy: number } {
  if (ms < tl.tapAt || ms >= tl.hitAt) return { sx: 1, sy: 1 };
  const u = (ms - tl.tapAt) / (tl.hitAt - tl.tapAt);
  const wobble =
    WARP_WOBBLE * Math.exp(-3 * u) * Math.cos(WARP_WAVES * Math.PI * u);
  const swell = WARP_SWELL * u ** 3;
  return { sx: 1 + wobble + swell, sy: 1 - wobble + swell };
}

// the capsule's two halves, painted once as one cel-shaded ball (a gold left
// half and a white right half, a white band down the seam with a button on
// it, two gloss spots) and cut down the seam
let halves: { left: HTMLCanvasElement; right: HTMLCanvasElement } | null = null;
const SPRITE_PAD = Math.ceil(SPRITE_R * OUTLINE);
const SPRITE_SIZE = 2 * (SPRITE_R + SPRITE_PAD);
function capsuleHalves() {
  if (halves) return halves;
  const r = SPRITE_R;
  const size = SPRITE_SIZE;
  const ball = document.createElement("canvas");
  ball.width = size;
  ball.height = size;
  const c = ball.getContext("2d")!;
  c.translate(size / 2, size / 2);
  const disc = (x: number, y: number, radius: number, fill: string) => {
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
  };
  c.save();
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.clip();
  for (const left of [true, false]) {
    c.save();
    c.beginPath();
    c.rect(left ? -r : 0, -r, r, r * 2);
    c.clip();
    c.fillStyle = left ? GOLD_SHADE : WHITE_SHADE;
    c.fillRect(-r, -r, r * 2, r * 2);
    disc(
      -r * LIT_SHIFT,
      -r * LIT_SHIFT,
      r * LIT_R,
      left ? COLOR.coinGold : COLOR.white,
    );
    c.restore();
  }
  // the band down the seam, inked on both edges
  c.fillStyle = INK;
  c.fillRect(
    (-r * BAND) / 2 - r * OUTLINE * 0.75,
    -r,
    r * BAND + r * OUTLINE * 1.5,
    r * 2,
  );
  c.fillStyle = COLOR.white;
  c.fillRect((-r * BAND) / 2, -r, r * BAND, r * 2);
  // two gloss spots up left
  c.fillStyle = COLOR.white;
  c.beginPath();
  c.ellipse(-r * 0.48, -r * 0.55, r * 0.2, r * 0.12, -0.75, 0, Math.PI * 2);
  c.fill();
  disc(-r * 0.7, -r * 0.24, r * 0.075, COLOR.white);
  c.restore();
  c.lineWidth = r * OUTLINE;
  c.strokeStyle = INK;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.stroke();
  // the button on the band, split with the halves
  disc(0, 0, r * BUTTON, INK);
  disc(0, 0, r * BUTTON - r * OUTLINE, COLOR.white);
  disc(0, 0, r * BUTTON_FACE, INK);
  const face = r * BUTTON_FACE - r * OUTLINE * 0.8;
  disc(0, 0, face, BUTTON_SHADE);
  disc(-face * 0.12, -face * 0.12, face * 0.86, BUTTON_FACE_COLOR);
  disc(-face * 0.4, -face * 0.4, face * 0.2, COLOR.white);
  const piece = (left: boolean) => {
    const canvas = document.createElement("canvas");
    canvas.width = size / 2;
    canvas.height = size;
    canvas
      .getContext("2d")!
      .drawImage(
        ball,
        left ? 0 : size / 2,
        0,
        size / 2,
        size,
        0,
        0,
        size / 2,
        size,
      );
    return canvas;
  };
  halves = { left: piece(true), right: piece(false) };
  return halves;
}

// the capsule's roll angle `ms` into the reveal: rocking 45deg either way
// without a stop from landing until the wisp dives
function rollAt(ms: number, tl: Timeline): number {
  if (ms < tl.rollFrom || ms >= tl.diveAt) return 0;
  return (
    ROLL_ANGLE *
    Math.sin((2 * Math.PI * (ms - tl.rollFrom)) / CONFIG.badgeCapsule.rollMs)
  );
}

// the whole capsule, its centre at (0, 0), turned `angle` about its centre
function drawCapsule(
  ctx: CanvasRenderingContext2D,
  d: number,
  angle: number,
): void {
  const { left, right } = capsuleHalves();
  ctx.rotate(angle);
  drawHalf(ctx, left, true, d);
  drawHalf(ctx, right, false, d);
}

// the map icon's ball, painted once: gold over white, seen a little from
// above so the white band round its middle curves down, its button on the
// band right of centre, leaning a touch
const ICON_BAND_Y = -0.04;
const ICON_BAND_SAG = 0.3;
const ICON_BAND = 0.11;
const ICON_TILT = -0.16;
const ICON_BUTTON_X = 0.16;
let iconBall: HTMLCanvasElement | null = null;
function capsuleIconBall(): HTMLCanvasElement {
  if (iconBall) return iconBall;
  const r = SPRITE_R;
  const size = SPRITE_SIZE;
  const bandY = (x: number) =>
    r * ICON_BAND_Y +
    r * ICON_BAND_SAG * Math.sqrt(Math.max(0, 1 - (x / r) ** 2));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d")!;
  c.translate(size / 2, size / 2);
  c.rotate(ICON_TILT);
  const disc = (x: number, y: number, radius: number, fill: string) => {
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
  };
  const bandPath = () => {
    c.beginPath();
    for (let i = 0; i <= 48; i++) {
      const x = -r * 1.05 + (2.1 * r * i) / 48;
      const y = bandY(Math.max(-r, Math.min(r, x)));
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
  };
  c.save();
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.clip();
  for (const top of [true, false]) {
    c.save();
    c.beginPath();
    c.moveTo(-size, top ? -size : size);
    for (let i = 0; i <= 48; i++) {
      const x = -r + (2 * r * i) / 48;
      c.lineTo(x, bandY(x));
    }
    c.lineTo(size, top ? -size : size);
    c.closePath();
    c.clip();
    c.fillStyle = top ? GOLD_SHADE : WHITE_SHADE;
    c.fillRect(-r, -r, r * 2, r * 2);
    disc(
      -r * LIT_SHIFT,
      top ? -r * 0.04 : -r * 0.1,
      r * 0.95,
      top ? COLOR.coinGold : COLOR.white,
    );
    c.restore();
  }
  bandPath();
  c.strokeStyle = INK;
  c.lineWidth = r * ICON_BAND + r * OUTLINE * 1.5;
  c.stroke();
  bandPath();
  c.strokeStyle = COLOR.white;
  c.lineWidth = r * ICON_BAND;
  c.stroke();
  c.fillStyle = COLOR.white;
  c.beginPath();
  c.ellipse(-r * 0.42, -r * 0.62, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  c.fill();
  disc(-r * 0.68, -r * 0.36, r * 0.08, COLOR.white);
  c.restore();
  c.lineWidth = r * OUTLINE;
  c.strokeStyle = INK;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.stroke();
  c.translate(r * ICON_BUTTON_X, bandY(r * ICON_BUTTON_X));
  disc(0, 0, r * BUTTON, INK);
  disc(0, 0, r * BUTTON - r * OUTLINE, COLOR.white);
  disc(0, 0, r * BUTTON_FACE, INK);
  const face = r * BUTTON_FACE - r * OUTLINE * 0.8;
  disc(0, 0, face, BUTTON_SHADE);
  disc(-face * 0.12, -face * 0.12, face * 0.86, BUTTON_FACE_COLOR);
  disc(-face * 0.4, -face * 0.4, face * 0.2, COLOR.white);
  iconBall = canvas;
  return canvas;
}

// the little capsule beside a building's map marker, rolling back and forth
// on the ground; its resting centre at (x, y), d across
export function drawCapsuleIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  d: number,
  now: number,
): void {
  const angle =
    ROLL_ANGLE * Math.sin((2 * Math.PI * now) / CONFIG.badgeCapsule.rollMs);
  const s = (d * SPRITE_SIZE) / (2 * SPRITE_R);
  ctx.save();
  ctx.translate(x + (angle * d) / 2, y);
  ctx.rotate(angle);
  ctx.drawImage(capsuleIconBall(), -s / 2, -s / 2, s, s);
  ctx.restore();
}

// the wisp: swooping in to hover over the capsule, dipping to tap the top of
// its seam and springing back up, then flying off as it bursts; null before
// it enters
function wispAt(
  ms: number,
  tl: Timeline,
  stage: BadgeStage,
  seam: Point,
  d: number,
): Point | null {
  const { flyMs } = CONFIG.badgeCapsule;
  if (ms < 0) return null;
  const hover = { x: seam.x, y: seam.y - HOVER_RISE };
  // it just touches the seam, its glow resting on top
  const touch = { x: seam.x, y: seam.y - WISP_SIZE * 0.6 };
  let at: Point;
  let bob = 1;
  if (ms < flyMs)
    at = swoop(
      { x: stage.x - OFF_SCREEN, y: stage.y + HOVER_RISE },
      hover,
      ms / flyMs,
      7,
      0.3,
      1.5,
      30,
    );
  else if (ms < tl.diveAt) at = hover;
  else if (ms < tl.tapAt) {
    const u = easeIn((ms - tl.diveAt) / (tl.tapAt - tl.diveAt));
    at = { x: hover.x, y: hover.y + (touch.y - hover.y) * u };
    bob = 1 - u;
  } else if (ms < tl.hitAt) {
    const u = easeOutBack((ms - tl.tapAt) / (tl.hitAt - tl.tapAt));
    at = { x: hover.x, y: touch.y + (hover.y - touch.y) * u };
    bob = 0;
  } else
    at = swoop(
      hover,
      { x: seam.x + d * 1.6, y: seam.y - d * 1.4 },
      clamp01((ms - tl.hitAt) / AWAY_MS),
      9,
      0.4,
      1,
      14,
    );
  return {
    x: at.x + Math.cos(ms / 260) * BOB * bob,
    y: at.y + Math.sin(ms / 190) * BOB * bob,
  };
}

// one half, its seam on the capsule's centre line
function drawHalf(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  left: boolean,
  d: number,
): void {
  const size = (d * SPRITE_SIZE) / (2 * SPRITE_R);
  ctx.drawImage(sprite, left ? -size / 2 : 0, -size / 2, size / 2, size);
}

// the capsule reveal `ms` after the stage is fully in
export function drawCapsuleReveal(
  ctx: CanvasRenderingContext2D,
  stage: BadgeStage,
  scene: CapsuleScene,
  ms: number,
  now: number,
): void {
  const tl = capsuleRevealTimeline();
  const { dropMs, growMs } = CONFIG.badgeCapsule;
  const short = Math.min(stage.w, stage.h);
  const d = short * CAPSULE_SHARE;
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const floorY = cy + d / 2;
  const opened = ms >= tl.hitAt;
  const sinceHit = ms - tl.hitAt;
  const badgeU = clamp01(sinceHit / growMs);
  const badgeSize = short * BADGE_SHARE;
  const rollAngle = opened ? 0 : rollAt(ms, tl);
  // rolling without slipping: it travels the arc it turns through
  const rollX = (rollAngle * d) / 2;
  drawBadgeSpotlight(
    ctx,
    cx,
    floorY + d * 0.15,
    opened ? badgeSize : d * 1.4,
    opened ? 1 : 0.7,
    opened ? 1 : 0.8,
    rollX,
  );

  const { left: leftHalf, right: rightHalf } = capsuleHalves();
  // dropping in, then landing with a squash
  const fall = clamp01(ms / dropMs);
  const dropY = -stage.h * DROP_HEIGHT * (1 - fall * fall);
  const sinceLand = ms - dropMs;
  const squash =
    sinceLand >= 0 && sinceLand < LAND_SQUASH_MS
      ? LAND_SQUASH * Math.sin((Math.PI * sinceLand) / LAND_SQUASH_MS)
      : 0;
  if (!opened) {
    const { sx, sy } = warpAt(ms, tl);
    ctx.save();
    ctx.translate(cx + rollX, floorY + dropY);
    ctx.scale((1 + squash) * sx, (1 - squash) * sy);
    ctx.translate(0, -d / 2);
    drawCapsule(ctx, d, rollAngle);
    ctx.restore();
  } else {
    // the halves pop out to either side, tumbling outward as they arc and fall
    const u = clamp01(sinceHit / HALF_FLY_MS);
    if (u < 1) {
      const out = d * HALF_THROW * (1 - (1 - u) ** 2);
      const y = cy - d * HALF_ARC * 4 * u * (1 - u) + d * u * u;
      ctx.globalAlpha = 1 - u * u;
      for (const left of [true, false]) {
        const side = left ? -1 : 1;
        ctx.save();
        ctx.translate(cx + side * out, y);
        ctx.rotate(side * HALF_SPIN * u);
        drawHalf(ctx, left ? leftHalf : rightHalf, left, d);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  // the badge pops out of the capsule and rises over the light
  const badgeY = cy - badgeSize * BADGE_RISE * badgeU;
  if (opened && scene.art) {
    const grow = easeOutBack(badgeU);
    const { w, h } = fitBadge(scene.art, badgeSize * grow);
    ctx.drawImage(scene.art, cx - w / 2, badgeY - h / 2, w, h);
  }

  drawWisp(
    ctx,
    (t) => wispAt(t, tl, stage, { x: cx, y: cy - d / 2 }, d),
    ms,
    now,
    WISP_SIZE,
  );

  if (opened)
    drawExplosion(
      ctx,
      cx,
      cy,
      sinceHit,
      now,
      BURST_SCALE,
      badgeSize * 0.9,
      SPARK_SIZE,
    );
  if (ms >= tl.settleAt)
    drawBadgeTitle(
      ctx,
      stage,
      scene.title,
      cx,
      badgeY,
      fitBadge(scene.art, badgeSize).h / 2,
      now - (ms - tl.settleAt),
      now,
    );
}
