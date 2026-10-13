// assembling for events and crits: a handful of big solid pieces of light
// flying in from all round, turning, each locking into place with a clunk,
// quicker and quicker, into one shape that blazes and flies apart. Cut a
// shape into pieces once (fanPieces, e.g. a SHAPES loop), plan the fly-in
// (planAssemble), then each frame drawAssembly
import { COLOR } from "../../../palette";
import { clamp01 } from "../../easing";
import { drawGlow, fadeStops } from "../../glowSprite";
import type { Point } from "../../wisp";

// a piece flies in over FLY_MS, easing out, turning off `spin` radians
export const FLY_MS = 260;
// the pieces lock in quicker and quicker: n of N at QUICKEN power of the span
const QUICKEN = 0.65;
const SPIN = 4;
// a lock's white flash, LOCK_GLOW of the shape's size round the piece
const LOCK_MS = 120;
const LOCK_GLOW = 0.6;
// the pieces' white edge, of the shape's size
const EDGE = 0.024;
// flying apart: APART of the shape's size out over APART_MS, fading
const APART = 0.35;
const APART_MS = 120;
const WHITE = fadeStops(COLOR.white);

export interface Piece {
  // its corners from its own middle, and where its middle locks in
  corners: Point[];
  home: Point;
  from: Point;
  spin: number;
  lockMs: number;
}

export interface Assembly {
  pieces: Piece[];
  centre: Point;
  size: number;
  // the last lock
  doneMs: number;
}

// a loop in a unit box (-1..1, round its middle; a SHAPES loop) cut into
// `count` wedges from its middle, `size` px from the middle to the edge
export function fanPieces(
  loop: readonly Point[],
  centre: Point,
  size: number,
  count: number,
): { corners: Point[]; home: Point }[] {
  const n = loop.length;
  const pieces: { corners: Point[]; home: Point }[] = [];
  for (let k = 0; k < count; k++) {
    const from = Math.floor((k * n) / count);
    const to = Math.floor(((k + 1) * n) / count);
    const points: Point[] = [{ x: centre.x, y: centre.y }];
    for (let i = from; i <= to; i++) {
      const p = loop[i % n];
      points.push({ x: centre.x + p.x * size, y: centre.y + p.y * size });
    }
    let x = 0;
    let y = 0;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    const home = { x: x / points.length, y: y / points.length };
    pieces.push({
      home,
      corners: points.map((p) => ({ x: p.x - home.x, y: p.y - home.y })),
    });
  }
  return pieces;
}

// the pieces flying in from `reach` px out, locking in shuffled order from
// startMs + FLY_MS, quicker and quicker, the last at endMs
export function planAssemble(
  cuts: { corners: Point[]; home: Point }[],
  centre: Point,
  size: number,
  startMs: number,
  endMs: number,
  reach: number,
): Assembly {
  const order = cuts
    .map((_, i) => ({ i, k: Math.random() }))
    .sort((a, b) => a.k - b.k);
  const first = startMs + FLY_MS;
  const last = Math.max(1, cuts.length - 1);
  const pieces: Piece[] = new Array(cuts.length);
  order.forEach(({ i }, n) => {
    const a = Math.random() * Math.PI * 2;
    pieces[i] = {
      corners: cuts[i].corners,
      home: cuts[i].home,
      from: {
        x: centre.x + Math.cos(a) * reach,
        y: centre.y + Math.sin(a) * reach,
      },
      spin: (Math.random() - 0.5) * 2 * SPIN,
      lockMs: first + (endMs - first) * (n / last) ** QUICKEN,
    };
  });
  return { pieces, centre, size, doneMs: endMs };
}

// the assembly at ms: pieces flying in and locked, then from apartMs flying
// apart from its middle and fading
export function drawAssembly(
  ctx: CanvasRenderingContext2D,
  assembly: Assembly,
  ms: number,
  apartMs = Infinity,
): void {
  const apart = ms > apartMs ? (ms - apartMs) / APART_MS : 0;
  if (apart >= 1) return;
  const { centre, size } = assembly;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineWidth = size * EDGE;
  ctx.globalAlpha = 1 - apart;
  for (const p of assembly.pieces) {
    const u = clamp01((ms - (p.lockMs - FLY_MS)) / FLY_MS);
    if (u <= 0) continue;
    const e = 1 - (1 - u) ** 3;
    const x =
      p.from.x +
      (p.home.x - p.from.x) * e +
      (p.home.x - centre.x) * APART * apart * 4;
    const y =
      p.from.y +
      (p.home.y - p.from.y) * e +
      (p.home.y - centre.y) * APART * apart * 4;
    const turn = p.spin * (1 - e);
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    ctx.beginPath();
    for (let i = 0; i < p.corners.length; i++) {
      const c = p.corners[i];
      const cx = x + c.x * cos - c.y * sin;
      const cy = y + c.x * sin + c.y * cos;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.closePath();
    ctx.fillStyle = COLOR.heavenlyGold;
    ctx.fill();
    ctx.strokeStyle = COLOR.white;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "lighter";
  for (const p of assembly.pieces) {
    const since = ms - p.lockMs;
    if (since < 0 || since >= LOCK_MS) continue;
    ctx.globalAlpha = 1 - since / LOCK_MS;
    drawGlow(ctx, WHITE, p.home.x, p.home.y, size * LOCK_GLOW);
  }
  ctx.restore();
}
