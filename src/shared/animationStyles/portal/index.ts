// portals for events and crits: twin gold rings seen edge-on; whatever dives
// into one bursts out of its twin at once, keeping its speed. Plan the run
// through them once (planWarp), then each frame drawPortal for every ring,
// the runner at warp.at(ms) (null while it's inside) and drawPortalPass at
// each of warp.passes
import { COLOR } from "../../../palette";
import { clamp01 } from "../../easing";
import { drawGlow, fadeStops } from "../../glowSprite";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { stampGlimmer } from "../../twinkle";
import type { Point } from "../../wisp";

// a ring's height over its width seen edge-on, its rim and core widths and
// glow, all of its half width
const SQUASH = 0.25;
const RIM = 0.12;
const CORE = 0.04;
const GLOW = 1.4;
const GLOW_ALPHA = 0.5;
const FLAT = 0.08;
// glitter whirling round the rim
const GLITTER = 12;
const GLITTER_SIZE = 0.2;
const WHIRL = 0.008;
const GLITTER_OUT: [number, number] = [1.08, 1.3];
// a pass: the ring rippling out and a white flash, glitter spat out
const PASS_MS = 220;
const FLASH_MS = 120;
const RIPPLE = 0.6;
const SPIT = 8;
const SPIT_REACH = 1.2;
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

// a ring `size` px from its middle to its rim, `open` 0..1, turned over by
// `turn` (1 one face, -1 the other, 0 edge-on to a line)
export function drawPortal(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  open: number,
  now: number,
  turn = 1,
): void {
  if (open <= 0 || size <= 0) return;
  const rx = size * open;
  const ry = rx * SQUASH * Math.max(FLAT, Math.abs(turn));
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * GLOW_ALPHA;
  drawGlow(ctx, GOLD, at.x, at.y, rx * GLOW);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.lineWidth = size * RIM;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
  ctx.lineWidth = size * CORE;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
  beginLightBatch(ctx);
  for (let i = 0; i < GLITTER; i++) {
    const a = (i / GLITTER) * Math.PI * 2 + now * WHIRL;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * rx * GLITTER_OUT[0],
      at.y + Math.sin(a) * ry * GLITTER_OUT[1],
      size * GLITTER_SIZE,
      a,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// something passing through a ring msSince ago: the ring rippling out, a
// white flash and glitter spat out of it
export function drawPortalPass(
  ctx: CanvasRenderingContext2D,
  at: Point,
  msSince: number,
  size: number,
): void {
  if (msSince < 0 || msSince > PASS_MS || size <= 0) return;
  const u = msSince / PASS_MS;
  const rx = size * (1 + RIPPLE * u);
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * (1 - u);
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, rx, rx * SQUASH, 0, 0, Math.PI * 2);
  ctx.lineWidth = size * RIM * (1 - u);
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
  const flash = 1 - msSince / FLASH_MS;
  if (flash > 0) {
    ctx.globalAlpha = alpha * flash;
    drawGlow(ctx, WHITE, at.x, at.y, size);
  }
  ctx.globalAlpha = alpha * (1 - u);
  beginLightBatch(ctx);
  for (let i = 0; i < SPIT; i++) {
    const a = (i / SPIT) * Math.PI * 2;
    const d = size * SPIT_REACH * u;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * d,
      at.y + Math.sin(a) * d * SQUASH * 2,
      size * GLITTER_SIZE * (1 - u),
      i,
      COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
}

// a spot, or a function giving it each frame (a ring on a bar that scrolls)
export type WarpSpot = Point | (() => Point);
const spotOf = (spot: WarpSpot): Point =>
  typeof spot === "function" ? spot() : spot;

// one stretch of the run, from leaving a ring (or its start) to diving into
// the next; `fall` speeds it up as it goes, like a drop
export interface WarpLeg {
  from: WarpSpot;
  to: WarpSpot;
  startMs: number;
  endMs: number;
  fall?: boolean;
}

export interface Warp {
  legs: WarpLeg[];
  startMs: number;
  endMs: number;
  // when it dives into a ring, every leg's end but the last
  passes: number[];
  // where it is at ms, written into `into`; null while inside a ring
  at(ms: number, into: Point): Point | null;
}

// a run through the rings, legs in order (a gap between two legs is the
// moment it's inside)
export function planWarp(legs: WarpLeg[]): Warp {
  return {
    legs,
    startMs: legs[0].startMs,
    endMs: legs[legs.length - 1].endMs,
    passes: legs.slice(0, -1).map((leg) => leg.endMs),
    at(ms, into) {
      for (const leg of legs) {
        if (ms < leg.startMs) return null;
        if (ms > leg.endMs) continue;
        const t = clamp01((ms - leg.startMs) / (leg.endMs - leg.startMs));
        const u = leg.fall ? 0.5 * t + 0.5 * t * t : t;
        const from = spotOf(leg.from);
        const to = spotOf(leg.to);
        into.x = from.x + (to.x - from.x) * u;
        into.y = from.y + (to.y - from.y) * u;
        return into;
      }
      return null;
    },
  };
}
