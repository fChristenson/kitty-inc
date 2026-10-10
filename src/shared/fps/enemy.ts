import { COLOR } from "../../palette";
import { lerp } from "../easing";
import { stampGlimmer } from "../twinkle";
import { fpsSight, type Fps, type FpsPoint } from "./world";
import { beginLightBatch, endLightBatch } from "../lightBatch";

// an enemy's colours and the parts it wears: a bandit, a demon, a soldier
export interface FpsEnemyLook {
  skin: string;
  eyes: string;
  body: string;
  arms: string;
  legs: string;
  boots: string;
  // how tall it stands, 1 about 0.75 of a screen width
  scale?: number;
  vest?: string;
  bandana?: string;
  belt?: { strap: string; buckle: string };
  holster?: string;
  mustache?: string;
  hat?: { crown: string; band: string };
  horns?: string;
  // what's in its raised hand; claws when it holds nothing
  gun?: string;
  claws?: string;
  // eyes that glow
  glow?: boolean;
}

export interface FpsEnemyPose {
  // 0 arm down at the hip, 1 raised to aim at the view
  aim: number;
  // its sway side to side, in its own units
  sway?: number;
  // its stride's phase, for it walking
  stride?: number;
  // a hit flashing it white
  hurt?: boolean;
  // 0 standing, 1 lying dead, toppled over to `fallSide`
  down?: number;
  fallSide?: number;
}

const LINE = 0.008;
const ARM = 0.045;
const STRIDE = 0.03;
const TOPPLE = 1.45;

// filled in colour, outlined in the stroke already set
function part(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
}

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  part(ctx, color);
}

function shape(
  ctx: CanvasRenderingContext2D,
  color: string,
  points: readonly (readonly [number, number])[],
): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  part(ctx, color);
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  part(ctx, color);
}

// an arm: an outlined thick stroke
function limb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineWidth = ARM + LINE * 2;
  ctx.strokeStyle = COLOR.black;
  ctx.stroke();
  ctx.lineWidth = ARM;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.lineWidth = LINE;
  ctx.strokeStyle = COLOR.black;
}

const VEST_LEFT = [
  [-0.09, -0.56],
  [-0.025, -0.56],
  [-0.01, -0.36],
  [-0.09, -0.32],
] as const;
const VEST_RIGHT = VEST_LEFT.map(([x, y]) => [-x, y] as const);
const BANDANA = [
  [-0.05, -0.57],
  [0.05, -0.57],
  [0, -0.5],
] as const;
const MUSTACHE = [
  [-0.04, -0.6],
  [0.04, -0.6],
  [0.02, -0.588],
  [-0.02, -0.588],
] as const;
const CROWN = [
  [-0.065, -0.665],
  [-0.055, -0.745],
  [0, -0.725],
  [0.055, -0.745],
  [0.065, -0.665],
] as const;
const HORN = [
  [-0.04, -0.66],
  [-0.085, -0.75],
  [-0.02, -0.67],
] as const;
const HORN_RIGHT = HORN.map(([x, y]) => [-x, y] as const);
const SPIKES = [
  [-0.09, -0.56],
  [-0.12, -0.6],
  [-0.06, -0.57],
] as const;
const SPIKES_RIGHT = SPIKES.map(([x, y]) => [-x, y] as const);

// an enemy standing at (x, 0, z) facing the view; returns where its raised
// hand is on screen (its gun's muzzle), null when it's behind the view
export function drawFpsEnemy(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  x: number,
  z: number,
  look: FpsEnemyLook,
  pose: FpsEnemyPose,
  now: number,
): FpsPoint | null {
  const feet = fpsSight(fps, x, 0, z);
  if (!feet) return null;
  const size = look.scale ?? 1;
  const s = feet.s * size;
  const { aim, sway = 0, stride = 0, hurt = false, down = 0 } = pose;
  const paint = (color: string) => (hurt ? COLOR.white : color);
  ctx.save();
  ctx.translate(feet.x, feet.y);
  ctx.scale(s, s);
  ctx.fillStyle = COLOR.black;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.16, 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (down > 0) ctx.rotate(-(pose.fallSide ?? 1) * TOPPLE * down * down);
  ctx.strokeStyle = COLOR.black;
  ctx.lineWidth = LINE;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const step = Math.sin(stride) * STRIDE;
  for (const [lx, lift] of [
    [-0.075, step],
    [0.015, -step],
  ]) {
    rect(ctx, lx, -0.3 - lift, 0.06, 0.24, paint(look.legs));
    rect(ctx, lx - 0.005, -0.08 - lift, 0.07, 0.08, paint(look.boots));
  }
  ctx.translate(sway, 0);
  rect(ctx, -0.09, -0.56, 0.18, 0.26, paint(look.body));
  if (look.vest) {
    shape(ctx, paint(look.vest), VEST_LEFT);
    shape(ctx, paint(look.vest), VEST_RIGHT);
  }
  if (look.horns) {
    shape(ctx, paint(look.horns), SPIKES);
    shape(ctx, paint(look.horns), SPIKES_RIGHT);
  }
  if (look.bandana) shape(ctx, paint(look.bandana), BANDANA);
  if (look.belt) {
    rect(ctx, -0.095, -0.33, 0.19, 0.035, paint(look.belt.strap));
    rect(ctx, -0.018, -0.332, 0.036, 0.04, paint(look.belt.buckle));
  }
  if (look.holster) rect(ctx, -0.14, -0.31, 0.045, 0.11, paint(look.holster));
  // its other arm hanging loose
  limb(ctx, 0.08, -0.53, 0.125, -0.36, paint(look.arms));
  dot(ctx, 0.125, -0.35, 0.022, paint(look.skin));
  dot(ctx, 0, -0.62, 0.055, paint(look.skin));
  if (look.mustache) shape(ctx, paint(look.mustache), MUSTACHE);
  ctx.fillStyle = paint(look.eyes);
  ctx.fillRect(-0.028, -0.637, 0.014, 0.012);
  ctx.fillRect(0.014, -0.637, 0.014, 0.012);
  if (look.horns) {
    shape(ctx, paint(look.horns), HORN);
    shape(ctx, paint(look.horns), HORN_RIGHT);
  }
  if (look.hat) {
    ctx.beginPath();
    ctx.ellipse(0, -0.66, 0.15, 0.025, 0, 0, Math.PI * 2);
    part(ctx, paint(look.hat.crown));
    shape(ctx, paint(look.hat.crown), CROWN);
    rect(ctx, -0.064, -0.69, 0.128, 0.022, paint(look.hat.band));
  }
  // its weapon arm, from the hip up to aim at the view
  const hand = {
    x: lerp([-0.12, -0.035], aim),
    y: lerp([-0.3, -0.47], aim),
  };
  limb(ctx, -0.08, -0.53, hand.x, hand.y, paint(look.arms));
  if (look.gun)
    rect(ctx, hand.x - 0.025, hand.y - 0.03, 0.05, 0.045, paint(look.gun));
  dot(ctx, hand.x, hand.y + 0.02, 0.024, paint(look.skin));
  if (!look.gun && look.claws) {
    ctx.strokeStyle = paint(look.claws);
    ctx.lineWidth = LINE * 1.5;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(hand.x + i * 0.014, hand.y + 0.005);
      ctx.lineTo(hand.x + i * 0.022, hand.y - 0.03);
    }
    ctx.stroke();
  }
  ctx.restore();
  if (look.glow && down < 1) {
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (const ex of [-0.021, 0.021])
      stampGlimmer(
        ctx,
        feet.x + (ex + sway) * s,
        feet.y - 0.631 * s,
        0.025 * s * (1 - down),
        now * 0.006,
        look.eyes,
      );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
  }
  return { x: feet.x + (hand.x + sway) * s, y: feet.y + hand.y * s, s };
}
