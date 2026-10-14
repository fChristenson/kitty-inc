// portals for events and crits: twin gold rings seen edge-on; whatever dives
// into one bursts out of its twin at once, keeping its speed. Plan the run
// through them once (planWarp, its legs straight or bowed), then each frame
// drawPortal for every ring (in one of PORTAL_LOOKS), the runner at
// warp.at(ms) (null while it's inside) and drawPortalPass at each of
// warp.passes
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

// what a ring looks like: only rims, glitter, beads and sparks of light
export interface PortalLook {
  // a second, thinner rim inside the first, `inner` of its size (0: none)
  inner: number;
  // the rim broken into `dashes` arcs turning `dashTurn` rad/ms (0: whole)
  dashes: number;
  dashTurn: number;
  // beads of light racing round the rim at `beadTurn` rad/ms
  beads: number;
  beadTurn: number;
  // glitter whirling round it (`whirl` rad/ms, negative the other way), and
  // sparks spat off the rim, `sparks` at a time
  glitter: number;
  whirl: number;
  sparks: number;
}

const PLAIN: PortalLook = {
  inner: 0,
  dashes: 0,
  dashTurn: 0,
  beads: 0,
  beadTurn: 0,
  glitter: GLITTER,
  whirl: WHIRL,
  sparks: 0,
};

// the rings to pick from: vary them between crits, and a pair can differ
export const PORTAL_LOOKS: readonly PortalLook[] = [
  PLAIN,
  // a double rim, the glitter whirling the other way
  { ...PLAIN, inner: 0.7, whirl: -0.012 },
  // beads of light racing round a bare rim
  { ...PLAIN, beads: 6, beadTurn: 0.012, glitter: 4 },
  // a rim of turning dashes
  { ...PLAIN, dashes: 6, dashTurn: 0.006, glitter: 8 },
  // sparks spitting off the rim all round
  { ...PLAIN, sparks: 14, glitter: 6, whirl: 0.016 },
  // a double dashed rim, beads chasing round it
  {
    ...PLAIN,
    inner: 0.74,
    dashes: 4,
    dashTurn: -0.008,
    beads: 3,
    beadTurn: 0.018,
    glitter: 0,
  },
];

// a look from PORTAL_LOOKS by number, wrapping round
export const portalLook = (n: number): PortalLook =>
  PORTAL_LOOKS[
    ((n % PORTAL_LOOKS.length) + PORTAL_LOOKS.length) % PORTAL_LOOKS.length
  ];

const BEAD = 0.26;
const SPARK_MS = 360;
const SPARK_REACH = 0.9;
const SPARK = 0.16;

// the rim rx by ry, whole or in turning dashes
function rim(
  ctx: CanvasRenderingContext2D,
  at: Point,
  rx: number,
  ry: number,
  look: PortalLook,
  now: number,
): void {
  ctx.beginPath();
  if (look.dashes > 0) {
    const step = (Math.PI * 2) / look.dashes;
    const turn = now * look.dashTurn;
    for (let k = 0; k < look.dashes; k++) {
      const a = turn + k * step;
      ctx.moveTo(at.x + Math.cos(a) * rx, at.y + Math.sin(a) * ry);
      ctx.ellipse(at.x, at.y, rx, ry, 0, a, a + step * 0.6);
    }
  } else ctx.ellipse(at.x, at.y, rx, ry, 0, 0, Math.PI * 2);
}

// a ring `size` px from its middle to its rim, `open` 0..1, turned over by
// `turn` (1 one face, -1 the other, 0 edge-on to a line), in `look`
export function drawPortal(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  open: number,
  now: number,
  turn = 1,
  look: PortalLook = PLAIN,
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
  rim(ctx, at, rx, ry, look, now);
  ctx.lineWidth = size * RIM;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
  ctx.lineWidth = size * CORE;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
  if (look.inner > 0) {
    rim(ctx, at, rx * look.inner, ry * look.inner, look, -now);
    ctx.lineWidth = size * RIM * 0.5;
    ctx.strokeStyle = COLOR.heavenlyGold;
    ctx.stroke();
  }
  beginLightBatch(ctx);
  for (let i = 0; i < look.glitter; i++) {
    const a = (i / look.glitter) * Math.PI * 2 + now * look.whirl;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * rx * GLITTER_OUT[0],
      at.y + Math.sin(a) * ry * GLITTER_OUT[1],
      size * GLITTER_SIZE,
      a,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  for (let i = 0; i < look.beads; i++) {
    const a = (i / look.beads) * Math.PI * 2 + now * look.beadTurn;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * rx,
      at.y + Math.sin(a) * ry,
      size * BEAD * open,
      i + 20,
      COLOR.white,
    );
  }
  for (let i = 0; i < look.sparks; i++) {
    const t = ((now + (i / look.sparks) * SPARK_MS) % SPARK_MS) / SPARK_MS;
    const a =
      i * 2.4 + Math.floor((now + (i / look.sparks) * SPARK_MS) / SPARK_MS);
    const out = 1 + SPARK_REACH * t;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * rx * out,
      at.y + Math.sin(a) * ry * out - size * 0.3 * t,
      size * SPARK * (1 - t),
      i + 40,
      i % 2 ? COLOR.heavenlyGold : COLOR.white,
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
// the next; `fall` speeds it up as it goes, like a drop; `arc` bows it that
// many px off its straight line (to the left of the way it's heading;
// negative to the right)
export interface WarpLeg {
  from: WarpSpot;
  to: WarpSpot;
  startMs: number;
  endMs: number;
  fall?: boolean;
  arc?: number;
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
        if (leg.arc) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const bow = (leg.arc * 4 * u * (1 - u)) / (Math.hypot(dx, dy) || 1);
          into.x += dy * bow;
          into.y -= dx * bow;
        }
        return into;
      }
      return null;
    },
  };
}
