// the Alchemy event's cartoon cauldron: an iron pot on stubby feet, its brew
// glowing and bubbling harder the higher `brew` (0..1) climbs
import { COLOR } from "../../palette";
import { drawGoldShimmer } from "../../shared/goldShimmer";
import { hash01 } from "../../shared/twinkle";
import { fillOutlined as outlined } from "../../utils";

const W = 210;
const H = 150;
const LEG_H = 18;
const LEG_W = 30;
const RIM_RX = W * 0.42;
const RIM_RY = 20;
const LIP = 11;
const OUTLINE = 6;
const BUBBLES = 12;
const BUBBLE_MS: [number, number] = [550, 950];
const BUBBLE_RISE: [number, number] = [25, 110];

// the body's middle and the brew's surface, for a pot standing on baseY
function layout(baseY: number) {
  const bodyY = baseY - LEG_H - H / 2;
  return { bodyY, rimY: bodyY - H * 0.36 };
}

// where coins pour in and lights shoot out
export function cauldronMouth(
  x: number,
  baseY: number,
): { x: number; y: number } {
  return { x, y: layout(baseY).rimY };
}

export function cauldronCenter(
  x: number,
  baseY: number,
): { x: number; y: number } {
  return { x, y: layout(baseY).bodyY };
}

export function drawCauldron(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  brew: number,
  now: number,
): void {
  const { bodyY, rimY } = layout(baseY);
  ctx.save();
  ctx.lineJoin = "round";
  drawGoldShimmer(
    ctx,
    x,
    rimY,
    W * 0.7 * brew,
    brew,
    1,
    now,
    COLOR.potionGreen,
  );

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(
      x + side * W * 0.28 - LEG_W / 2,
      bodyY + H * 0.35,
      LEG_W,
      H * 0.15 + LEG_H,
      8,
    );
    outlined(ctx, COLOR.cauldronIronDark, OUTLINE);
  }

  // the bowl, cut flat where the rim sits on it
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - W, rimY, W * 2, H * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(x, bodyY, W / 2, H / 2, 0, 0, Math.PI * 2);
  outlined(ctx, COLOR.cauldronIron, OUTLINE);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = COLOR.white;
  ctx.beginPath();
  ctx.ellipse(
    x - W * 0.25,
    bodyY + H * 0.02,
    W * 0.05,
    H * 0.22,
    0.25,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(x, rimY, RIM_RX, RIM_RY, 0, 0, Math.PI * 2);
  outlined(ctx, COLOR.cauldronIronDark, OUTLINE);
  ctx.beginPath();
  ctx.ellipse(x, rimY, RIM_RX - LIP, RIM_RY - LIP / 2, 0, 0, Math.PI * 2);
  outlined(ctx, COLOR.potionGreen, 3);
  // the brew glows paler as it heats up
  ctx.fillStyle = COLOR.potionGreenLight;
  ctx.globalAlpha = 0.6 * brew;
  ctx.fill();
  ctx.globalAlpha = 0.4 + 0.6 * brew;
  ctx.beginPath();
  ctx.ellipse(
    x - RIM_RX * 0.2,
    rimY - 2,
    RIM_RX * 0.35,
    RIM_RY * 0.25,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.globalAlpha = 1;

  // more bubbles join in, rising higher, as the brew heats up
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = COLOR.black;
  ctx.fillStyle = COLOR.potionGreenLight;
  for (let k = 0; k < BUBBLES; k++) {
    if (k / BUBBLES >= brew) break;
    const period = BUBBLE_MS[0] + (BUBBLE_MS[1] - BUBBLE_MS[0]) * hash01(k, 1);
    const t = ((now + hash01(k, 2) * period) / period) % 1;
    const rise = BUBBLE_RISE[0] + (BUBBLE_RISE[1] - BUBBLE_RISE[0]) * brew;
    const r = (5 + 8 * hash01(k, 3)) * (0.6 + 0.4 * t);
    ctx.globalAlpha = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.beginPath();
    ctx.arc(
      x + (hash01(k, 4) - 0.5) * RIM_RX * 1.4,
      rimY - t * rise,
      r,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
