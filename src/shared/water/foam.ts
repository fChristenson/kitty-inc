// the water's white foam and sparkling sun glints, shared by its shapes
import { COLOR } from "../../palette";
import { drawGlimmer, hash01 } from "../twinkle";

type Point = { x: number; y: number };

const GLINT_SIZE = 20;

// white foam along whatever path trace() lays down (in ctx's current space)
export function strokeFoam(
  ctx: CanvasRenderingContext2D,
  trace: () => void,
  alpha: number,
): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const [lineWidth, color, a] of [
    [14, COLOR.tideShallow, 0.6],
    [5, COLOR.white, 0.95],
  ] as const) {
    ctx.globalAlpha = alpha * a;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    trace();
    ctx.stroke();
  }
  ctx.restore();
}

// count sun glints popping in and out, each drifting at its own pace; at(f,
// below) places glint f (0..1 along the surface, wrapped) below (0..1) under it
export function drawGlints(
  ctx: CanvasRenderingContext2D,
  count: number,
  alpha: number,
  now: number,
  at: (f: number, below: number) => Point | null,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const pop = Math.max(0, Math.sin(now / 260 + i * 2.3)) ** 3;
    if (pop <= 0.02) continue;
    const drift = (now / 1000) * 0.03 * (hash01(i, 5) - 0.5);
    const f = ((((i + hash01(i, 3)) / count + drift) % 1) + 1) % 1;
    const point = at(f, hash01(i, 7));
    if (!point) continue;
    drawGlimmer(
      ctx,
      point.x,
      point.y,
      GLINT_SIZE * (0.5 + 0.5 * hash01(i, 9)) * pop,
      now / 500 + i,
      COLOR.white,
    );
  }
  ctx.restore();
}
