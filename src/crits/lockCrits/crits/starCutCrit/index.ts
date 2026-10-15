// Star Cut, a lock crit: a blade wisp darts round the dark locked floor and
// carves a giant five-pointed star across the lock in five quickening swipes,
// each a flash, a jolt and glitter spilling out of the cut; the star's lines
// glow as its pieces tremble, then one long cut through the middle slides
// them apart and they burst the lock open; the glitter pours through the new
// floor's button onto the one below, whose next taps cost half
import meta from "./meta";
import { addHalfTaps } from "../../../buttonCrits/buttonBonus";
import { critTarget } from "../../../critKit/target";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  sliceOffset,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { FLOOR_H } from "../../../../floors/constants";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const LOCK = getLockCenter();
const BTN = getButtonCenter(false);
// the new floor's button and the one under it, from the lock's middle
const NX = BTN.x - LOCK.x;
const NY = BTN.y - LOCK.y;
const DX = NX;
const DY = NY + FLOOR_H;

const IN_MS = 150;
// the lock's price, baked PX times as sharp over HALF_W x HALF_H either side
const HALF_W = 280;
const HALF_H = 75;
const PX = 2;
// the star: R from its middle to a point, its inner corners INNER of that
const R = 160;
const INNER = 0.382;
// the five swipes point to point (0, 2, 4, 1, 3, 0), quickening
const FIRST_AT = 300;
const SWIPE_MS = [80, 76, 72, 66, 62];
const SWIPE_GAP = [170, 135, 105, 80];
const ORDER = [0, 2, 4, 1, 3, 0];
const CUT_W = 30;
const SPILL = 22;
const SPILL_N = 14;
const FLASH_MS = 120;
// the blade flicks OVER px past each point before the next swipe
const OVER = 46;
// the long cut through the middle, LONG_GAP after the star's done
const LONG_GAP = 190;
const LONG_MS = 100;
const LONG_W = 52;
const LONG_SPILL = 32;
const LONG_SPILL_N = 26;
const LONG_SHAKE = 1.4;
// the pieces sliding GAP px apart along each cut, trembling up to TREMBLE,
// then flying FLY px out over FLY_MS as the lock bursts
const GAP = 10;
const TREMBLE: [number, number] = [2, 10];
const FLY = 380;
const FLY_MS = 240;
const OPEN_GAP = 90;
const OPEN_BLAST = 420;
// the glitter: POUR specks off the pieces, arcing into the new button over
// ARC_MS, then poured on down into the one below over DOWN_MS
const POUR = 60;
const POUR_STAGGER = 60;
const ARC_MS = 180;
const DOWN_MS = 90;
const POUR_SIZE = 24;
const TAPS_BLAST = 210;
const BLADE_SIZE = 34;
// shakes by step: a swipe through, the burst, the taps landing
const SHAKES = [0.7, 2.6, 1.1];

// the star's points and inner corners
const VX = new Float32Array(5);
const VY = new Float32Array(5);
const IX = new Float32Array(5);
const IY = new Float32Array(5);
for (let k = 0; k < 5; k++) {
  const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
  VX[k] = Math.cos(a) * R;
  VY[k] = Math.sin(a) * R;
  IX[k] = Math.cos(a + Math.PI / 5) * R * INNER;
  IY[k] = Math.sin(a + Math.PI / 5) * R * INNER;
}

// the swipes, then the long cut
const SLASHES: Slash[] = [];
let at = FIRST_AT;
for (let k = 0; k < 5; k++) {
  const a = ORDER[k];
  const b = ORDER[k + 1];
  SLASHES.push(
    planSlash({ x: VX[a], y: VY[a] }, { x: VX[b], y: VY[b] }, at, SWIPE_MS[k]),
  );
  at += SWIPE_MS[k] + (SWIPE_GAP[k] ?? 0);
}
const STAR_DONE = SLASHES[4].endMs;
const LONG_FROM: Point = { x: -HALF_W * 1.5, y: -36 };
const LONG_TO: Point = { x: HALF_W * 1.5, y: 44 };
SLASHES.push(planSlash(LONG_FROM, LONG_TO, STAR_DONE + LONG_GAP, LONG_MS));
const LONG = SLASHES[5];
const OPEN_AT = LONG.endMs + OPEN_GAP;
const IN_BUTTON_AT = OPEN_AT + POUR_STAGGER + ARC_MS;
const TAPS_AT = IN_BUTTON_AT + DOWN_MS;

// the star's lines so far, and its pieces: five points, the middle, and the
// rest of the price around them
const LINES: Path2D[] = [];
for (let k = 0; k < 5; k++) {
  const path = new Path2D();
  for (let j = 0; j <= k; j++) {
    path.moveTo(VX[ORDER[j]], VY[ORDER[j]]);
    path.lineTo(VX[ORDER[j + 1]], VY[ORDER[j + 1]]);
  }
  LINES.push(path);
}
interface Piece {
  path: Path2D;
  centre: Point;
  // its way out from the middle
  ox: number;
  oy: number;
}
const PIECES: Piece[] = [];
for (let k = 0; k < 5; k++) {
  const p = (k + 4) % 5;
  const path = new Path2D();
  path.moveTo(VX[k], VY[k]);
  path.lineTo(IX[k], IY[k]);
  path.lineTo(IX[p], IY[p]);
  path.closePath();
  const cx = (VX[k] + IX[k] + IX[p]) / 3;
  const cy = (VY[k] + IY[k] + IY[p]) / 3;
  const d = Math.hypot(cx, cy) || 1;
  PIECES.push({ path, centre: { x: cx, y: cy }, ox: cx / d, oy: cy / d });
}
const MIDDLE = new Path2D();
for (let k = 0; k < 5; k++) MIDDLE.lineTo(IX[k], IY[k]);
MIDDLE.closePath();
PIECES.push({ path: MIDDLE, centre: { x: 0, y: 6 }, ox: 0, oy: 0 });
const OUTER = new Path2D();
OUTER.rect(-HALF_W, -HALF_H, 2 * HALF_W, 2 * HALF_H);
for (let k = 0; k < 5; k++) {
  OUTER.lineTo(VX[k], VY[k]);
  OUTER.lineTo(IX[k], IY[k]);
}
OUTER.closePath();

// the glitter's specks: where on the star each starts, its arc's crest, when
const POUR_SX = new Float32Array(POUR);
const POUR_SY = new Float32Array(POUR);
const POUR_CX = new Float32Array(POUR);
const POUR_CY = new Float32Array(POUR);
const POUR_T0 = new Float32Array(POUR);
for (let i = 0; i < POUR; i++) {
  const a = hash01(i, 7301) * Math.PI * 2;
  const d = R * Math.sqrt(hash01(i, 7302));
  POUR_SX[i] = Math.cos(a) * d;
  POUR_SY[i] = Math.sin(a) * d;
  POUR_CX[i] = POUR_SX[i] * 1.6;
  POUR_CY[i] = POUR_SY[i] - lerp(180, 320, hash01(i, 7303));
  POUR_T0[i] = OPEN_AT + POUR_STAGGER * hash01(i, 7304);
}

// the blade: round the floor onto the first point, along each swipe with a
// flick past its end, out to the long cut, through it, into the new button
// and down to the one below
const APPROACH: [number, number, number, number, number, number] = [
  420, 120, -560, 230, -460, -300,
];
const OUT_CTRL: Point = { x: -380, y: -300 };
const DIVE_CTRL: Point = { x: LONG_TO.x + 60, y: NY - 260 };
const blade: Point = { x: 0, y: 0 };
function bladeAt(ms: number): Point | null {
  if (ms < 0 || ms > TAPS_AT) return null;
  if (ms < FIRST_AT) {
    const t = ms / FIRST_AT;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    blade.x = a * APPROACH[0] + b * APPROACH[2] + c * APPROACH[4] + d * VX[0];
    blade.y = a * APPROACH[1] + b * APPROACH[3] + c * APPROACH[5] + d * VY[0];
    return blade;
  }
  for (let k = 0; k < 6; k++) {
    const s = SLASHES[k];
    if (ms < s.startMs) {
      // between swipes: flicking past the last point and snapping back, or
      // swinging out to the long cut
      const prev = SLASHES[k - 1];
      const u = (ms - prev.endMs) / (s.startMs - prev.endMs);
      if (k < 5) {
        const fx = prev.to.x - prev.from.x;
        const fy = prev.to.y - prev.from.y;
        const len = Math.hypot(fx, fy) || 1;
        const over = OVER * Math.sin(Math.PI * u);
        blade.x = prev.to.x + (fx / len) * over;
        blade.y = prev.to.y + (fy / len) * over;
      } else {
        const v = 1 - u;
        blade.x =
          v * v * prev.to.x + 2 * v * u * OUT_CTRL.x + u * u * LONG_FROM.x;
        blade.y =
          v * v * prev.to.y + 2 * v * u * OUT_CTRL.y + u * u * LONG_FROM.y;
      }
      return blade;
    }
    if (ms <= s.endMs) {
      const u = (ms - s.startMs) / (s.endMs - s.startMs);
      blade.x = lerp(s.from.x, s.to.x, u);
      blade.y = lerp(s.from.y, s.to.y, u);
      return blade;
    }
  }
  if (ms < IN_BUTTON_AT) {
    const u = (ms - LONG.endMs) / (IN_BUTTON_AT - LONG.endMs);
    const v = 1 - u;
    blade.x = v * v * LONG_TO.x + 2 * v * u * DIVE_CTRL.x + u * u * NX;
    blade.y = v * v * LONG_TO.y + 2 * v * u * DIVE_CTRL.y + u * u * NY;
    return blade;
  }
  blade.x = NX;
  blade.y = lerp(NY, DY, (ms - IN_BUTTON_AT) / DOWN_MS);
  return blade;
}

const prices = new WeakMap<Running, HTMLCanvasElement>();
function bakePrice(r: Running): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 2 * HALF_W * PX;
  canvas.height = 2 * HALF_H * PX;
  const g = canvas.getContext("2d")!;
  g.scale(PX, PX);
  g.translate(HALF_W, HALF_H);
  r.play.drawBar?.(g, 0, 0);
  return canvas;
}

const ORIGIN: Point = { x: 0, y: 0 };
const BELOW: Point = { x: DX, y: DY };
const off: Point = { x: 0, y: 0 };

// a white-gold flash fading out, age ms after it
function drawFlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  age: number,
  size: number,
): void {
  if (age < 0 || age >= FLASH_MS) return;
  const u = age / FLASH_MS;
  ctx.globalAlpha = (1 - u) * 0.85;
  ctx.beginPath();
  ctx.arc(x, y, size * (0.5 + 0.5 * u), 0, Math.PI * 2);
  ctx.fill();
}

registerFloorCrit("starCutCrit", {
  // half-price taps on the open floor under the one it opened, its button
  // flipping
  reward(t) {
    const below = t.floors[t.floors.indexOf(t.floor) - 1];
    if (!below?.unlocked) return;
    addHalfTaps(below, meta.values.taps);
    critTarget({
      floor: below,
      ownFloor: t.ownFloor,
      floors: t.floors,
      step: t.step,
      tier: t.tier,
      count: t.count,
      color: t.color,
      price: t.price,
      index: t.index,
    }).flipButton();
  },
  plan(r, _bars, hit) {
    prices.set(r, bakePrice(r));
    r.play.hideBars?.([0]);
    for (const s of SLASHES) hit(0, s.endMs, 0);
    hit(0, OPEN_AT, 1);
    hit(0, TAPS_AT, 2);
  },
  draw(ctx, r, ms, bars) {
    const price = prices.get(r);
    if (!price) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (r.kicked === 0 && ms >= LONG.endMs) {
      r.kicked = 1;
      r.shake(LONG_SHAKE);
    }

    ctx.save();
    ctx.translate(lock.x, lock.y);
    const fly = clamp01((ms - OPEN_AT) / FLY_MS);
    // the price: whole till the first cut's through, then in pieces
    if (ms < SLASHES[0].endMs) {
      ctx.drawImage(price, -HALF_W, -HALF_H, 2 * HALF_W, 2 * HALF_H);
    } else if (fly < 1) {
      const shiver =
        ms < STAR_DONE
          ? 0
          : lerp(
              TREMBLE[0],
              TREMBLE[1],
              clamp01((ms - STAR_DONE) / (OPEN_AT - STAR_DONE)),
            );
      const out = FLY * fly * fly;
      const fill =
        ms < STAR_DONE
          ? 0
          : 0.15 + 0.3 * clamp01((ms - STAR_DONE) / (OPEN_AT - STAR_DONE));
      ctx.fillStyle = COLOR.heavenlyGold;
      for (let i = 0; i < PIECES.length; i++) {
        const p = PIECES[i];
        sliceOffset(SLASHES, p.centre, ms, GAP, off);
        const x = off.x + p.ox * out + Math.sin(ms * 0.11 + i * 2.3) * shiver;
        const y = off.y + p.oy * out + Math.cos(ms * 0.13 + i * 1.7) * shiver;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = 1 - fly;
        if (fill > 0) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = (1 - fly) * fill;
          ctx.fill(p.path);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1 - fly;
        }
        ctx.clip(p.path);
        ctx.drawImage(price, -HALF_W, -HALF_H, 2 * HALF_W, 2 * HALF_H);
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = 1 - fly;
      ctx.clip(OUTER, "evenodd");
      ctx.drawImage(price, -HALF_W, -HALF_H, 2 * HALF_W, 2 * HALF_H);
      ctx.restore();
    }

    // the star's lines glowing, throbbing faster as the pieces tremble
    let done = 0;
    while (done < 5 && ms >= SLASHES[done].endMs) done++;
    const glow = 1 - clamp01((ms - OPEN_AT) / 150);
    if (done > 0 && glow > 0) {
      const beat =
        0.08 + 0.1 * clamp01((ms - STAR_DONE) / (OPEN_AT - STAR_DONE));
      const pulse = 0.6 + 0.4 * Math.sin(ms * beat);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.globalAlpha = 0.35 * pulse * glow;
      ctx.lineWidth = 26;
      ctx.stroke(LINES[done - 1]);
      ctx.strokeStyle = COLOR.white;
      ctx.globalAlpha = 0.8 * glow;
      ctx.lineWidth = 6;
      ctx.stroke(LINES[done - 1]);
      ctx.restore();
    }

    // the cuts, their glitter spilling, a flash at each one's end
    for (let k = 0; k < SLASHES.length; k++) {
      const long = k === 5;
      drawSlash(ctx, SLASHES[k], ms, long ? LONG_W : CUT_W, now);
      drawSliceSpill(
        ctx,
        SLASHES[k],
        ms,
        long ? LONG_SPILL : SPILL,
        long ? LONG_SPILL_N : SPILL_N,
      );
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#fff3b0";
    for (let k = 0; k < SLASHES.length; k++) {
      const s = SLASHES[k];
      drawFlash(
        ctx,
        s.to.x,
        s.to.y,
        ms - s.endMs,
        k === 5 ? 200 : lerp(90, 140, k / 4),
      );
    }
    drawFlash(ctx, NX, NY, ms - IN_BUTTON_AT, 120);
    ctx.globalAlpha = 1;
    ctx.restore();

    // the glitter pouring off the burst pieces into the new button, on down
    if (ms >= OPEN_AT && ms < TAPS_AT) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < POUR; i++) {
        const age = ms - POUR_T0[i];
        if (age < 0) continue;
        let x: number;
        let y: number;
        if (age < ARC_MS) {
          const s = age / ARC_MS;
          const v = 1 - s;
          x = v * v * POUR_SX[i] + 2 * v * s * POUR_CX[i] + s * s * NX;
          y = v * v * POUR_SY[i] + 2 * v * s * POUR_CY[i] + s * s * NY;
        } else {
          const s = clamp01((ms - IN_BUTTON_AT) / DOWN_MS);
          x = NX + (POUR_SX[i] / R) * 20 * (1 - s);
          y = lerp(NY, DY, s * s);
        }
        stampGlimmer(
          ctx,
          x,
          y,
          POUR_SIZE,
          i + ms * 0.01,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }

    drawWispBetween(
      ctx,
      bladeAt,
      ms,
      now,
      BLADE_SIZE,
      clamp01(ms / OPEN_AT),
      0,
      TAPS_AT,
    );
    drawDetonation(ctx, ORIGIN, ms - OPEN_AT, OPEN_BLAST, now);
    drawDetonation(ctx, BELOW, ms - TAPS_AT, TAPS_BLAST, now);
    ctx.restore();

    // the number diving into the lock
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      const e = u * u;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x, e),
        lerp(0, lock.y, e),
        r.flashFont * (1 - 0.6 * e),
        { alpha: 1 - u },
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
