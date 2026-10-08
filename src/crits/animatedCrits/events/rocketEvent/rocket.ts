// the Rocket event's cartoon rocket: a white body with a red nose and fins and
// a porthole, a flickering flame under it once it's lit
import { COLOR } from "../../../../palette";
import { fillOutlined, roundRect } from "../../../../utils";

const W = 64;
const H = 170;
const OUTLINE = 5;
const BODY_TOP = -H * 0.68; // where the nose meets the body, from its base
const BODY_BOTTOM = -14;
const FLAME: [number, number] = [45, 85];

// its porthole, where coins pour in, from its base
export const ROCKET_WINDOW = { x: 0, y: -H * 0.47 };
export const ROCKET_HEIGHT = H;

export interface RocketState {
  // 0..1 (or more, flat out): the flame's strength
  flame: number;
  rotation: number;
  scale: number;
  // squashed below 1, stretched tall above it, from its base
  stretch?: number;
}

export function drawRocket(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  { flame, rotation, scale, stretch = 1 }: RocketState,
  now: number,
): void {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(rotation);
  ctx.scale(scale / Math.sqrt(stretch), scale * Math.sqrt(stretch));
  ctx.lineJoin = "round";

  if (flame > 0) {
    const flicker = 0.5 + 0.5 * Math.sin(now / 35) * Math.sin(now / 53);
    const length = (FLAME[0] + (FLAME[1] - FLAME[0]) * flicker) * flame;
    for (const [width, reach, color] of [
      [W * 0.42, 1, COLOR.flameOrange],
      [W * 0.24, 0.65, COLOR.flameYellow],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(-width, BODY_BOTTOM);
      ctx.quadraticCurveTo(
        -width * 0.6,
        length * reach * 0.6,
        0,
        length * reach,
      );
      ctx.quadraticCurveTo(
        width * 0.6,
        length * reach * 0.6,
        width,
        BODY_BOTTOM,
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // the nozzle, then a fin each side
  ctx.beginPath();
  ctx.moveTo(-W * 0.28, BODY_BOTTOM - 4);
  ctx.lineTo(W * 0.28, BODY_BOTTOM - 4);
  ctx.lineTo(W * 0.36, 0);
  ctx.lineTo(-W * 0.36, 0);
  ctx.closePath();
  fillOutlined(ctx, COLOR.rocketNozzle, OUTLINE);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * W * 0.4, BODY_TOP * 0.42);
    ctx.quadraticCurveTo(side * W * 0.95, BODY_TOP * 0.2, side * W * 0.9, 4);
    ctx.lineTo(side * W * 0.4, BODY_BOTTOM);
    ctx.closePath();
    fillOutlined(ctx, COLOR.rocketRed, OUTLINE);
  }

  roundRect(ctx, -W / 2, BODY_TOP, W, BODY_BOTTOM - BODY_TOP, W * 0.3);
  fillOutlined(ctx, COLOR.rocketBody, OUTLINE);

  ctx.beginPath();
  ctx.moveTo(-W / 2, BODY_TOP + 6);
  ctx.bezierCurveTo(-W / 2, BODY_TOP - H * 0.18, -W * 0.12, -H + 6, 0, -H);
  ctx.bezierCurveTo(
    W * 0.12,
    -H + 6,
    W / 2,
    BODY_TOP - H * 0.18,
    W / 2,
    BODY_TOP + 6,
  );
  ctx.closePath();
  fillOutlined(ctx, COLOR.rocketRed, OUTLINE);

  ctx.beginPath();
  ctx.arc(ROCKET_WINDOW.x, ROCKET_WINDOW.y, W * 0.24, 0, Math.PI * 2);
  fillOutlined(ctx, COLOR.rocketWindow, 4);
  ctx.beginPath();
  ctx.arc(
    ROCKET_WINDOW.x - W * 0.07,
    ROCKET_WINDOW.y - W * 0.07,
    W * 0.07,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = COLOR.white;
  ctx.fill();
  ctx.restore();
}
