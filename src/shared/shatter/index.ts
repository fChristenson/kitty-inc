// the frozen screen breaking like a pane of glass, for Shatter events: cracks
// run out from an impact, then the frozen frame (copied once) is cut along
// them into shards that fly off. Build the pane at arm, draw from the event's
// drawUnder (under its coins), in floor-local coords
import { clamp01, easeOut } from "../easing";
import { drawBeam } from "../beam";
import { copyScreen, drawScreenPart, type ScreenCopy } from "../screenCopy";
import type { Point } from "../wisp";

const CRACK_WIDTH = 5;
// a crack takes this long to run its full length once it opens
const RUN_MS = 120;
const GRAVITY = 0.0028;
// the copy is taken this long before the shatter, so the cracks and the
// shatter's blast aren't baked into the shards
export const PANE_COPY_EARLY_MS = 60;

export interface Shard {
  poly: Point[];
  box: { x: number; y: number; w: number; h: number };
  // its middle, and its flight in px/ms (outward from the impact)
  centre: Point;
  vx: number;
  vy: number;
}

export interface Pane {
  impact: Point;
  // each crack's corner points, out from the impact past the screen's edge
  cracks: Point[][];
  shards: Shard[];
  copy: ScreenCopy | null;
}

export interface PaneOptions {
  cracks?: number;
  // the shards' rings, px out from the impact (one more reaches past the edges)
  rings?: number[];
  // shards fly out between these px/ms, inner rings faster
  speed?: [number, number];
}

type Area = { left: number; top: number; right: number; bottom: number };

const scratch: Point = { x: 0, y: 0 };

export function createPane(
  impact: Point,
  area: Area,
  { cracks = 9, rings = [150, 380], speed = [0.15, 0.55] }: PaneOptions = {},
): Pane {
  const far =
    Math.max(
      Math.hypot(area.left - impact.x, area.top - impact.y),
      Math.hypot(area.right - impact.x, area.top - impact.y),
      Math.hypot(area.left - impact.x, area.bottom - impact.y),
      Math.hypot(area.right - impact.x, area.bottom - impact.y),
    ) + 60;
  const radii = [0, ...rings, far];
  const offset = Math.random() * Math.PI * 2;
  const lines: Point[][] = Array.from({ length: cracks }, (_, i) => {
    const angle =
      offset + ((i + 0.5 * (Math.random() - 0.5)) / cracks) * Math.PI * 2;
    return radii.map((r, j) => {
      const a = angle + (j > 0 ? (Math.random() - 0.5) * 0.25 : 0);
      const rr =
        r * (j > 0 && j < radii.length - 1 ? 0.8 + 0.4 * Math.random() : 1);
      return {
        x: impact.x + Math.cos(a) * rr,
        y: impact.y + Math.sin(a) * rr,
      };
    });
  });
  const shards: Shard[] = [];
  for (let i = 0; i < cracks; i++) {
    const a = lines[i];
    const b = lines[(i + 1) % cracks];
    for (let j = 0; j + 1 < radii.length; j++) {
      const poly =
        j === 0 ? [a[0], b[1], a[1]] : [a[j], b[j], b[j + 1], a[j + 1]];
      const xs = poly.map((p) => p.x);
      const ys = poly.map((p) => p.y);
      const centre = {
        x: xs.reduce((s, x) => s + x, 0) / xs.length,
        y: ys.reduce((s, y) => s + y, 0) / ys.length,
      };
      const dx = centre.x - impact.x;
      const dy = centre.y - impact.y;
      const length = Math.hypot(dx, dy) || 1;
      const v =
        speed[0] +
        (speed[1] - speed[0]) *
          (1 - j / radii.length) *
          (0.6 + 0.4 * Math.random());
      shards.push({
        poly,
        box: {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        },
        centre,
        vx: (dx / length) * v,
        vy: (dy / length) * v,
      });
    }
  }
  return { impact, cracks: lines, shards, copy: null };
}

// the cracks, each running out from the impact once ms passes openedAt(i)
export function drawCracks(
  ctx: CanvasRenderingContext2D,
  pane: Pane,
  ms: number,
  openedAt: (crack: number) => number,
): void {
  pane.cracks.forEach((crack, i) => {
    const since = ms - openedAt(i);
    if (since < 0) return;
    const reach = easeOut(clamp01(since / RUN_MS)) * (crack.length - 1);
    for (let j = 0; j < reach; j++) {
      const f = Math.min(1, reach - j);
      const from = crack[j];
      scratch.x = from.x + (crack[j + 1].x - from.x) * f;
      scratch.y = from.y + (crack[j + 1].y - from.y) * f;
      drawBeam(ctx, from, scratch, CRACK_WIDTH, 0.9);
    }
  });
}

// copies the frozen screen once (call every frame from drawUnder from
// PANE_COPY_EARLY_MS before the shatter, before drawing over it)
export function copyPane(ctx: CanvasRenderingContext2D, pane: Pane): void {
  pane.copy ??= copyScreen(ctx);
}

// every shard, t ms into its flight (gravity pulling it down), at alpha;
// `move` may shift a shard further (into is its offset so far)
export function drawShards(
  ctx: CanvasRenderingContext2D,
  pane: Pane,
  t: number,
  alpha = 1,
  move?: (shard: Shard, t: number, into: Point) => void,
): void {
  const copy = pane.copy;
  if (!copy || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const s of pane.shards) {
    scratch.x = s.vx * t;
    scratch.y = s.vy * t + 0.5 * GRAVITY * t * t;
    move?.(s, t, scratch);
    const dx = scratch.x;
    const dy = scratch.y;
    const { x, y, w, h } = s.box;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.poly[0].x + dx, s.poly[0].y + dy);
    for (let k = 1; k < s.poly.length; k++)
      ctx.lineTo(s.poly[k].x + dx, s.poly[k].y + dy);
    ctx.closePath();
    ctx.clip();
    drawScreenPart(ctx, copy, x, y, w, h, x + dx, y + dy, w, h);
    ctx.restore();
  }
  ctx.restore();
}

// a white flash over the area behind the shards, at alpha
export function drawPaneFlash(
  ctx: CanvasRenderingContext2D,
  area: Area,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(
    area.left,
    area.top,
    area.right - area.left,
    area.bottom - area.top,
  );
  ctx.restore();
}

// frees the copy once the event's done with it
export function releasePane(pane: Pane): void {
  pane.copy = null;
}
