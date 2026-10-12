// soft round glows (pools of light, shadows, flashes): a radial gradient drawn
// once per look onto a sprite and stamped, never rebuilt every frame
import { lightArgs, queueLightArgs } from "../lightBatch";
import { compositeOf } from "../spriteBatch";
import { processWhenIdle } from "../idle";
const HALF = 128;
const sprites = new Map<string, HTMLCanvasElement>();
// looked up by the stops array itself first: hoist stops to a constant and
// a stamp costs no string building
const byStops = new WeakMap<FadeStops, HTMLCanvasElement>();

// stops: [offset 0..1, css color] from the middle out
export type FadeStops = readonly (readonly [number, string])[];

export function glowSprite(stops: FadeStops): HTMLCanvasElement {
  const known = byStops.get(stops);
  if (known) return known;
  const key = stops.map(([o, c]) => `${o}:${c}`).join("|");
  let sprite = sprites.get(key);
  if (sprite) {
    byStops.set(stops, sprite);
    return sprite;
  }
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = HALF * 2;
  const ctx = sprite.getContext("2d")!;
  const gradient = ctx.createRadialGradient(HALF, HALF, 0, HALF, HALF, HALF);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, HALF * 2, HALF * 2);
  sprites.set(key, sprite);
  byStops.set(stops, sprite);
  return sprite;
}

// a "#rrggbb" color fading out to nothing at the edge, solid out to `solid`;
// its sprite is baked at idle, before an effect first stamps it
export function fadeStops(color: string, solid = 0): FadeStops {
  const stops: FadeStops =
    solid > 0
      ? [
          [0, color],
          [solid, color],
          [1, `${color}00`],
        ]
      : [
          [0, color],
          [1, `${color}00`],
        ];
  processWhenIdle([stops], glowSprite);
  return stops;
}

// the glow of radius r round (x, y), squashed to `squash` of its height
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  stops: FadeStops,
  x: number,
  y: number,
  r: number,
  squash = 1,
): void {
  if (r <= 0) return;
  const sprite = glowSprite(stops);
  if (compositeOf(ctx) === "lighter") {
    lightArgs[0] = 0;
    lightArgs[1] = 0;
    lightArgs[2] = HALF * 2;
    lightArgs[3] = HALF * 2;
    lightArgs[4] = x - r;
    lightArgs[5] = y - r * squash;
    lightArgs[6] = r * 2;
    lightArgs[7] = r * 2 * squash;
    lightArgs[8] = ctx.globalAlpha;
    lightArgs[9] = 1;
    lightArgs[10] = 0;
    if (queueLightArgs(ctx, sprite)) return;
  }
  ctx.drawImage(sprite, x - r, y - r * squash, r * 2, r * 2 * squash);
}
