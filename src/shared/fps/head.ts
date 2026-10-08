import { COLOR } from "../../palette";
import { lerp } from "../easing";
import { stampGlimmer } from "../twinkle";
import { fpsSight, type Fps } from "./world";

// a floating head's colours: a one-eyed demon, a beholder
export interface FpsHeadLook {
  skin: string;
  spots: string;
  horns: string;
  mouth: string;
  teeth: string;
  iris: string;
  // its radius, 1 about a fifth of a screen width
  scale?: number;
}

export interface FpsHeadPose {
  // 0..1 its mouth gaping wider, a glow charging in it
  charge: number;
  // a hit flashing it white
  hurt?: boolean;
  // 0 floating, 1 dropped dead on the floor
  down?: number;
}

export interface FpsHeadDrawn {
  x: number;
  y: number;
  // its radius on screen, px
  r: number;
}

// its radius in screen widths, and its outline of that
export const FPS_HEAD_RADIUS = 0.22;
const LINE = 0.045;
const SPIKES = 5;
const SPOTS: [number, number, number][] = [
  [-0.62, -0.2, 0.09],
  [0.58, -0.32, 0.12],
  [0.7, 0.15, 0.07],
  [-0.5, 0.25, 0.08],
  [0.2, -0.7, 0.07],
];
const TEETH = 7;

// a demon head floating with its middle at (x, y, z), staring at the view;
// returns its middle and radius on screen, null behind the view
export function drawFpsHead(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  x: number,
  y: number,
  z: number,
  look: FpsHeadLook,
  pose: FpsHeadPose,
  now: number,
): FpsHeadDrawn | null {
  const radius = FPS_HEAD_RADIUS * (look.scale ?? 1);
  const { charge, hurt = false, down = 0 } = pose;
  // dropping onto the floor, squashing as it lands
  const lift = lerp([y, radius * 0.6], down * down);
  const center = fpsSight(fps, x, lift, z);
  const floor = fpsSight(fps, x, 0, z);
  if (!center || !floor) return null;
  const r = radius * center.s;
  const paint = (color: string) => (hurt ? COLOR.white : color);
  ctx.save();
  ctx.fillStyle = COLOR.black;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(floor.x, floor.y, r * 0.8, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.translate(center.x, center.y);
  ctx.scale(r * (1 + 0.25 * down), r * (1 - 0.4 * down));
  ctx.strokeStyle = COLOR.black;
  ctx.lineWidth = LINE;
  ctx.lineJoin = "round";
  // horns round its crown
  ctx.fillStyle = paint(look.horns);
  for (let i = 0; i < SPIKES; i++) {
    const a = -Math.PI / 2 + (i - (SPIKES - 1) / 2) * 0.45;
    const tip = 1.32 - Math.abs(i - (SPIKES - 1) / 2) * 0.08;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.16) * 0.92, Math.sin(a - 0.16) * 0.92);
    ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
    ctx.lineTo(Math.cos(a + 0.16) * 0.92, Math.sin(a + 0.16) * 0.92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fillStyle = paint(look.skin);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = paint(look.spots);
  for (const [sx, sy, sr] of SPOTS) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  // its gaping mouth and its teeth
  const gape = 0.16 + 0.3 * charge;
  ctx.beginPath();
  ctx.ellipse(0, 0.42, 0.62, gape, 0, 0, Math.PI * 2);
  ctx.fillStyle = paint(look.mouth);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = paint(look.teeth);
  ctx.beginPath();
  for (let i = 0; i < TEETH; i++) {
    const tx = -0.48 + (i * 0.96) / (TEETH - 1);
    const edge = gape * Math.sqrt(Math.max(0, 1 - (tx / 0.62) ** 2));
    const tooth = 0.07 + 0.05 * charge;
    ctx.moveTo(tx - 0.06, 0.42 - edge);
    ctx.lineTo(tx, 0.42 - edge + tooth);
    ctx.lineTo(tx + 0.06, 0.42 - edge);
    ctx.moveTo(tx - 0.06, 0.42 + edge);
    ctx.lineTo(tx, 0.42 + edge - tooth);
    ctx.lineTo(tx + 0.06, 0.42 + edge);
  }
  ctx.fill();
  // its one big eye, shutting as it dies
  const open = 1 - down;
  if (open > 0) {
    ctx.beginPath();
    ctx.ellipse(0, -0.22, 0.36, 0.3 * open, 0, 0, Math.PI * 2);
    ctx.fillStyle = paint(COLOR.white);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -0.22, 0.18, 0.18 * open, 0, 0, Math.PI * 2);
    ctx.fillStyle = paint(look.iris);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -0.22, 0.08, 0.08 * open, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.black;
    ctx.fill();
  }
  // its brow over the eye
  ctx.beginPath();
  ctx.moveTo(-0.46, -0.5 + 0.1 * charge);
  ctx.quadraticCurveTo(0, -0.62, 0.46, -0.5 + 0.1 * charge);
  ctx.lineWidth = LINE * 2.5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
  if (charge > 0 && down === 0) {
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    stampGlimmer(
      ctx,
      center.x,
      center.y + 0.42 * r,
      r * 0.35 * charge,
      now * 0.01,
      COLOR.heavenlyGold,
    );
    ctx.globalCompositeOperation = previous;
  }
  return { x: center.x, y: center.y, r };
}
