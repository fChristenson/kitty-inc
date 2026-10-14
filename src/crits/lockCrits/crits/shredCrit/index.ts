// Shred, a lock crit: swift slashes cut across the locked floor's price in
// quick fire, each a flash, a jolt and glitter spilling out of the cut, the
// price's pieces sliding apart along every cut; a cross of two long cuts
// tears through it, the pieces fly apart and the floor bursts open: its
// button's next taps land double
import { CONFIG } from "../../../../config";
import { doubleTaps } from "../../../buttonCrits/tapPerks";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  sliceOffset,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 160;
// the price cut into COLS x ROWS pieces over HALF_W either side and HALF_H
// above and below the lock's middle
const COLS = 4;
const ROWS = 2;
const HALF_W = 280;
const HALF_H = 75;
// the cuts across it (from and to, of its half size), CUT_GAPS apart
// (closing), each sliding the pieces GAP px apart
const CUTS: [number, number, number, number][] = [
  [-1.2, -1.4, -0.2, 1.4],
  [1.2, -1.5, 0.3, 1.5],
  [-1.3, 0.6, 1.3, -0.3],
  [0.1, -1.6, 0.6, 1.6],
];
const FIRST_MS = IN_MS + 140;
const CUT_GAPS: [number, number] = [210, 110];
const GAP = 12;
const CUT_W = 30;
const SPILL = 24;
const SPILL_N = 16;
const CUT_FLASH_MS = 140;
const CUT_SHAKE: [number, number] = [0.5, 0.9];
// the cross: two long cuts CROSS_GAP_MS after the last, CROSS_LAG apart
const CROSS_GAP_MS = 180;
const CROSS_LAG = 60;
const CROSS_MS = 100;
const CROSS_W = 50;
const CROSS_SPILL = 34;
const CROSS_SPILL_N = 26;
const CROSS_SHAKE = 1.6;
// the pieces flying FLY px apart over FLY_MS, faster and faster, fading
const FLY = 420;
const FLY_MS = 260;
const OPEN_GAP_MS = 60;
const PAY_GAP_MS = 400;
const OPEN_BLAST = 240;
const TAIL_MS = 900;
// shakes by step: unused (the cuts shake themselves), the opening, the taps
const SHAKES = [0.2, 2.4, 1];

interface Piece {
  x: number;
  y: number;
  w: number;
  h: number;
  centre: Point;
}
interface State {
  slashes: Slash[];
  crossAt: number;
  openAt: number;
  // the price baked once, plain and flashed white, PX times as sharp
  price: HTMLCanvasElement;
  flashed: HTMLCanvasElement;
}
const PX = 2;

function bakePrice(r: Running, flash: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 2 * HALF_W * PX;
  canvas.height = 2 * HALF_H * PX;
  const g = canvas.getContext("2d")!;
  g.scale(PX, PX);
  g.translate(HALF_W, HALF_H);
  r.play.drawBar?.(g, 0, flash);
  return canvas;
}
const states = new WeakMap<Running, State>();
const PIECES: Piece[] = Array.from({ length: COLS * ROWS }, (_, i) => {
  const w = (2 * HALF_W) / COLS;
  const h = (2 * HALF_H) / ROWS;
  const x = -HALF_W + (i % COLS) * w;
  const y = -HALF_H + Math.floor(i / COLS) * h;
  return { x, y, w, h, centre: { x: x + w / 2, y: y + h / 2 } };
});
const off: Point = { x: 0, y: 0 };

registerFloorCrit("shredCrit", {
  // double taps on the floor it opened
  reward(t) {
    doubleTaps.add(t.floor, t.count * CONFIG.crit.shredTaps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    let t = FIRST_MS;
    const slashes = CUTS.map(([ax, ay, bx, by], k) => {
      const slash = planSlash(
        { x: ax * HALF_W, y: ay * HALF_H },
        { x: bx * HALF_W, y: by * HALF_H },
        t,
      );
      t += lerp(CUT_GAPS[0], CUT_GAPS[1], k / (CUTS.length - 1));
      return slash;
    });
    const crossAt = slashes[slashes.length - 1].endMs + CROSS_GAP_MS;
    slashes.push(
      planSlash(
        { x: -HALF_W * 1.3, y: -HALF_H * 1.8 },
        { x: HALF_W * 1.3, y: HALF_H * 1.8 },
        crossAt,
        CROSS_MS,
      ),
      planSlash(
        { x: HALF_W * 1.3, y: -HALF_H * 1.8 },
        { x: -HALF_W * 1.3, y: HALF_H * 1.8 },
        crossAt + CROSS_LAG,
        CROSS_MS,
      ),
    );
    const openAt = slashes[slashes.length - 1].endMs + OPEN_GAP_MS;
    hit(0, openAt, 1);
    hit(0, openAt + PAY_GAP_MS, 2);
    states.set(r, {
      slashes,
      crossAt,
      openAt,
      price: bakePrice(r, 0),
      flashed: bakePrice(r, 1),
    });
    r.play.hideBars?.([0]);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const mid = bars[0];
    const { slashes } = state;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // each cut through: a jolt, harder each, the cross hardest
    while (r.kicked < slashes.length && ms >= slashes[r.kicked].endMs) {
      const k = r.kicked++;
      r.shake(
        k < CUTS.length
          ? lerp(CUT_SHAKE[0], CUT_SHAKE[1], k / (CUTS.length - 1))
          : CROSS_SHAKE,
      );
    }
    let flash = 0;
    for (const s of slashes) {
      const since = ms - s.endMs;
      if (since >= 0 && since < CUT_FLASH_MS)
        flash = Math.max(flash, 1 - since / CUT_FLASH_MS);
    }
    const crossed = slashes[slashes.length - 1].endMs;
    const fly = clamp01((ms - crossed) / FLY_MS);
    if (fly < 1)
      for (const p of PIECES) {
        sliceOffset(slashes, p.centre, ms, GAP, off);
        const outX = p.centre.x / HALF_W;
        const outY = p.centre.y / HALF_H;
        const x = mid.x + off.x + outX * FLY * fly * fly + p.x;
        const y = mid.y + off.y + outY * FLY * 0.5 * fly * fly + p.y;
        const sx = (p.x + HALF_W) * PX;
        const sy = (p.y + HALF_H) * PX;
        ctx.globalAlpha = 1 - fly;
        ctx.drawImage(state.price, sx, sy, p.w * PX, p.h * PX, x, y, p.w, p.h);
        if (flash > 0) {
          ctx.globalAlpha = (1 - fly) * flash;
          ctx.drawImage(
            state.flashed,
            sx,
            sy,
            p.w * PX,
            p.h * PX,
            x,
            y,
            p.w,
            p.h,
          );
        }
        ctx.globalAlpha = 1;
      }
    ctx.save();
    ctx.translate(mid.x, mid.y);
    for (let k = 0; k < slashes.length; k++) {
      const crossing = k >= CUTS.length;
      drawSlash(ctx, slashes[k], ms, crossing ? CROSS_W : CUT_W, now);
      drawSliceSpill(
        ctx,
        slashes[k],
        ms,
        crossing ? CROSS_SPILL : SPILL,
        crossing ? CROSS_SPILL_N : SPILL_N,
      );
    }
    ctx.restore();
    drawDetonation(ctx, mid, ms - state.openAt, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
