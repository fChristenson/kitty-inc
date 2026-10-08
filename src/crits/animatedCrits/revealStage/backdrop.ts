// the reveal stage's backdrop: a blue radial glow (like a Mega Man "weapon get"
// screen) with speed stripes rushing right to left, fading out over a soft
// gradient edge on each side
import { COLOR } from "../../../palette";
import { hash01 } from "../../../shared/twinkle";
import type { StageRect } from ".";

type Range = [number, number];

// the soft gradient edge on each side, of the stage's width
export const FEATHER = 0.5;
// the edges are drawn this small and stretched, smooth as gradients are
const FEATHER_RES: Range = [48, 96];
const STRIPES = 34;
const STRIPE_SPEED: Range = [1.6, 3.2]; // stage widths a second
const STRIPE_LENGTH: Range = [0.15, 0.5]; // of the stage's width
const STRIPE_THICKNESS: Range = [3, 22];

const within = ([a, b]: Range, t: number) => a + (b - a) * t;

let featherCanvas: HTMLCanvasElement | null = null;

function skyGradient(
  ctx: CanvasRenderingContext2D,
  stage: StageRect,
): CanvasGradient {
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const sky = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    Math.hypot(stage.w, stage.h) / 2,
  );
  sky.addColorStop(0, COLOR.revealSky);
  sky.addColorStop(0.45, COLOR.revealBlue);
  sky.addColorStop(1, COLOR.revealDeep);
  return sky;
}

// the glow carried on over (x, x + width), fading to nothing toward its outer side
function drawFeather(
  ctx: CanvasRenderingContext2D,
  stage: StageRect,
  x: number,
  width: number,
  fadesLeft: boolean,
): void {
  const [resW, resH] = FEATHER_RES;
  featherCanvas ??= document.createElement("canvas");
  // resizing also clears it and resets its state
  featherCanvas.width = resW;
  featherCanvas.height = resH;
  const f = featherCanvas.getContext("2d")!;
  const sx = resW / width;
  const sy = resH / stage.h;
  f.setTransform(sx, 0, 0, sy, -x * sx, -stage.y * sy);
  f.fillStyle = skyGradient(f, stage);
  f.fillRect(x, stage.y, width, stage.h);
  f.globalCompositeOperation = "destination-in";
  const mask = f.createLinearGradient(x, 0, x + width, 0);
  mask.addColorStop(fadesLeft ? 0 : 1, `${COLOR.white}00`);
  mask.addColorStop(fadesLeft ? 1 : 0, COLOR.white);
  f.fillStyle = mask;
  f.fillRect(x, stage.y, width, stage.h);
  ctx.drawImage(featherCanvas, x, stage.y, width, stage.h);
}

// the sky and its two feathered edges, smooth gradients only, drawn once per
// stage size this small and stretched
const BACKDROP_RES: Range = [384, 192];
let backdrop: { w: number; h: number; canvas: HTMLCanvasElement } | null = null;

function backdropSprite(w: number, h: number): HTMLCanvasElement {
  if (backdrop && backdrop.w === w && backdrop.h === h) return backdrop.canvas;
  const canvas = backdrop?.canvas ?? document.createElement("canvas");
  const [resW, resH] = BACKDROP_RES;
  canvas.width = resW;
  canvas.height = resH;
  const ctx = canvas.getContext("2d")!;
  const feather = w * FEATHER;
  const stage = { x: 0, y: 0, w, h };
  ctx.setTransform(resW / (w + feather * 2), 0, 0, resH / h, 0, 0);
  ctx.translate(feather, 0);
  ctx.fillStyle = skyGradient(ctx, stage);
  ctx.fillRect(0, 0, w, h);
  drawFeather(ctx, stage, -feather, feather, true);
  drawFeather(ctx, stage, w, feather, false);
  backdrop = { w, h, canvas };
  return canvas;
}

// multiplies into the caller's globalAlpha; stripes off leaves just the sky
export function drawStageBackdrop(
  ctx: CanvasRenderingContext2D,
  stage: StageRect,
  now: number,
  stripes = true,
): void {
  const { x, y, w, h } = stage;
  const fade = ctx.globalAlpha;
  const feather = w * FEATHER;
  ctx.drawImage(backdropSprite(w, h), x - feather, y, w + feather * 2, h);
  if (!stripes) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < STRIPES; i++) {
    const length = w * within(STRIPE_LENGTH, hash01(i, 1));
    const speed = (within(STRIPE_SPEED, hash01(i, 2)) * w) / 1000;
    const travel = w + length;
    const along = (now * speed + hash01(i, 3) * travel) % travel;
    const thickness = within(STRIPE_THICKNESS, hash01(i, 5) ** 2);
    ctx.globalAlpha = fade * (0.2 + 0.45 * hash01(i, 6));
    ctx.fillStyle = i % 4 === 0 ? COLOR.white : COLOR.revealStripe;
    ctx.fillRect(
      x + w - along,
      y + h * hash01(i, 4) - thickness / 2,
      length,
      thickness,
    );
  }
  ctx.restore();
}
