// Ribbon Cutting, an income crit: a grand opening. The number shrinks away and
// gold ribbons of light shoot out taut from a big bow under the total,
// criss-crossing round it, quivering ever tighter as the bow trembles and
// glows; swift swipes snip them in quick fire, quickening, each cut snapping
// the ribbon apart (its bow end whipping back curling, its far end sliding
// off), glitter spilling and streaming up into the total, a share each. The
// finale: one long cut through the bow, then the cross, the bow bursting in
// the huge blast as its glitter floods the total
import { COLOR } from "../../../../palette";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  sliceOffset,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

// the bow's knot from the readout's middle
const KNOT: Point = { x: 0, y: 105 };
// the ribbons: lines through the knot at LINES rad, each a spoke either side
// reaching REACH_X/REACH_Y out; both of a line shooting out GROW_GAP_MS
// after the last over GROW_MS
const LINES = [-0.3, 0.25, -0.85, 0.75];
const SPOKES = LINES.length * 2;
const REACH_X = 600;
const REACH_Y = 330;
const GROW_AT = 80;
const GROW_GAP_MS = 35;
const GROW_MS = 180;
const RIBBON_W = 16;
const SEGS = 8;
// taut: SAG px of belly, quivering up to THRUM px as it tightens
const SAG = 8;
const THRUM = 9;
// the cuts in ORDER (spokes, flitting side to side), from FIRST_CUT_MS,
// GAPS_MS apart and SWIPE_MS each (both closing), CUT_U along the spoke,
// REACH px either side of it
const ORDER = [0, 5, 3, 6, 1, 4, 2, 7];
const FIRST_CUT_MS = 520;
const GAPS_MS: [number, number] = [190, 65];
const SWIPE_MS: [number, number] = [75, 60];
const CUT_U: [number, number] = [0.5, 0.68];
const CUT_REACH = 70;
const CUT_W = 22;
const SPILL = 18;
const SPILL_N = 12;
// the bow end whipping back into the knot over RECOIL_MS, curling CURL px
// over CURL_TURNS half-waves; the far end snapping SNAP of the way back and
// sliding SLIDE px off over SLIDE_MS
const RECOIL_MS = 150;
const CURL = 34;
const CURL_TURNS = 2.5;
const SNAP = 0.55;
const SLIDE = 420;
const SLIDE_MS = 260;
const SNAP_FLASH = 120;
const SNAP_MS = 120;
// glitter streaming up into the total: STREAM_N specks GAP_MS apart, each
// crossing in STREAM_MS, arcing LIFT px over, flashing LAND as it lands
const STREAM_N = 12;
const STREAM_GAP_MS = 10;
const STREAM_MS = 230;
const LIFT = 140;
const SPECK = 20;
const LAND = 46;
const LAND_MS = 110;
// the bow: loops LOOP_RX x LOOP_RY round, tipped up LOOP_TILT at their ends,
// tails out TAIL_X and down TAIL_Y; popping in at BOW_AT over BOW_POP_MS
const LOOP_RX = 88;
const LOOP_RY = 58;
const LOOP_TILT = 34;
const LOOP_SEGS = 14;
const TAIL_X = 80;
const TAIL_Y = 150;
const TAIL_SEGS = 5;
const TAIL_WAVE = 12;
const BOW_W = 24;
const BOW_AT = 40;
const BOW_POP_MS = 160;
// swelling SWELL a cut, jolting JOLT bigger for JOLT_MS; trembling and
// glowing up to the burst
const SWELL = 0.05;
const JOLT = 0.18;
const JOLT_MS = 140;
const TREMBLE: [number, number] = [1, 10];
const GLOW: [number, number] = [70, 240];
const KNOT_GLOW = 60;
// the finale LONG_GAP_MS after the last cut: the long cut LONG_X either
// side of the knot over LONG_MS, then the cross CROSS_GAP_MS after it
const LONG_GAP_MS = 150;
const LONG_MS = 120;
const LONG_X = 640;
const LONG_TILT = 50;
const LONG_W = 40;
const CROSS_GAP_MS = 45;
const CROSS_MS = 75;
const CROSS_X = 70;
const CROSS_Y = 230;
const CROSS_W = 46;
const FIN_SPILL = 32;
const FIN_SPILL_N = 22;
// the bow's pieces sliding GAP apart along the cuts, then flung FLING px out
// over BURST_MS; BURST_N specks streaming up from SPREAD round the knot
const GAP = 26;
const FLING = 520;
const BURST_MS = 240;
const BURST_FLASH = 260;
const BURST_N = 40;
const BURST_GAP_MS = 4;
const SPREAD = 110;
// shakes by step: a snip, the bow's burst, the long cut
const SHAKES = [0.7, 3.2, 1.6];

interface Spoke {
  // unit way out from the knot, its length
  dx: number;
  dy: number;
  length: number;
  growAt: number;
  cutU: number;
  cut: Slash;
  // where it's cut, and its glitter's landing spots on the readout
  cx: number;
  cy: number;
  tx: Float32Array;
  ty: Float32Array;
  seed: number;
}
interface State {
  spokes: Spoke[];
  finale: Slash[];
  burstAt: number;
  // where the burst's specks start and land
  fx: Float32Array;
  fy: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  swooshes: Float32Array;
  swooshed: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

// a loop of the bow from the knot (s 1 right), built once
const LOOP_X = new Float32Array(LOOP_SEGS + 1);
const LOOP_Y = new Float32Array(LOOP_SEGS + 1);
for (let k = 0; k <= LOOP_SEGS; k++) {
  const a = Math.PI - (k / LOOP_SEGS) * Math.PI * 2;
  LOOP_X[k] = LOOP_RX * (1 + Math.cos(a));
  LOOP_Y[k] = -LOOP_RY * Math.sin(a) - (LOOP_TILT * (1 + Math.cos(a))) / 2;
}
// the bow's pieces (left loop, right loop, left tail, right tail): each's
// middle from the knot, and the way it's flung
const PIECE_SIDE = [-1, 1, -1, 1];
const PIECE_X = [-LOOP_RX, LOOP_RX, -TAIL_X / 2, TAIL_X / 2];
const PIECE_Y = [-LOOP_TILT / 2, -LOOP_TILT / 2, TAIL_Y / 2, TAIL_Y / 2];
const PIECE_OUT_X = new Float32Array(4);
const PIECE_OUT_Y = new Float32Array(4);
for (let i = 0; i < 4; i++) {
  const l = Math.hypot(PIECE_X[i], PIECE_Y[i]);
  PIECE_OUT_X[i] = PIECE_X[i] / l;
  PIECE_OUT_Y[i] = PIECE_Y[i] / l;
}

const a0: Point = { x: 0, y: 0 };
const a1: Point = { x: 0, y: 0 };
const mid: Point = { x: 0, y: 0 };
const apart: Point = { x: 0, y: 0 };

// a ribbon from a to b in segs beams, bowed `wave` px off its line by
// sin(pi u turns + phase), growing along it if `curl`
function drawRibbon(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number,
  alpha: number,
  wave: number,
  turns: number,
  phase: number,
  curl: boolean,
  segs: number,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.hypot(dx, dy);
  if (length < 1 || alpha <= 0) return;
  const nx = -dy / length;
  const ny = dx / length;
  for (let k = 0; k <= segs; k++) {
    const u = k / segs;
    const off = wave * Math.sin(Math.PI * u * turns + phase) * (curl ? u : 1);
    a1.x = ax + dx * u + nx * off;
    a1.y = ay + dy * u + ny * off;
    if (k > 0) drawBeam(ctx, a0, a1, width, alpha);
    a0.x = a1.x;
    a0.y = a1.y;
  }
}

// one of the bow's loops (s 1 right) from the knot at (x, y)
function drawLoop(
  ctx: CanvasRenderingContext2D,
  s: number,
  x: number,
  y: number,
  scale: number,
  alpha: number,
): void {
  a0.x = x;
  a0.y = y;
  for (let k = 1; k <= LOOP_SEGS; k++) {
    a1.x = x + s * LOOP_X[k] * scale;
    a1.y = y + LOOP_Y[k] * scale;
    drawBeam(ctx, a0, a1, BOW_W, alpha);
    a0.x = a1.x;
    a0.y = a1.y;
  }
}

// a speck streaming from (fx, fy) up onto (tx, ty) `since` ms on, then its
// flash where it lands; in a light batch
function drawSpeck(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  since: number,
  salt: number,
): void {
  if (since < 0) return;
  const t = since / STREAM_MS;
  if (t >= 1) {
    const landed = since - STREAM_MS;
    if (landed < LAND_MS)
      stampGlimmer(
        ctx,
        tx,
        ty,
        LAND * (1 - landed / LAND_MS),
        salt,
        salt % 2 ? COLOR.white : COLOR.heavenlyGold,
      );
    return;
  }
  const u = t * (0.55 + 0.45 * t);
  const v = 1 - u;
  const cx = (fx + tx) / 2;
  const cy = Math.min(fy, ty) - LIFT;
  stampGlimmer(
    ctx,
    v * v * fx + 2 * u * v * cx + u * u * tx,
    v * v * fy + 2 * u * v * cy + u * u * ty,
    SPECK * (1 - 0.4 * t),
    salt + since * 0.02,
    salt % 3 ? COLOR.heavenlyGold : COLOR.white,
  );
}

registerFloorCrit("ribbonCuttingCrit", {
  plan(r, _bars, hit) {
    const spokes: Spoke[] = [];
    for (let i = 0; i < SPOKES; i++) {
      const a = LINES[i % LINES.length] + (i >= LINES.length ? Math.PI : 0);
      const ex = Math.cos(a) * REACH_X;
      const ey = Math.sin(a) * REACH_Y;
      const length = Math.hypot(ex, ey);
      spokes.push({
        dx: ex / length,
        dy: ey / length,
        length,
        growAt: GROW_AT + (i % LINES.length) * GROW_GAP_MS,
        cutU: lerp(CUT_U[0], CUT_U[1], hash01(i, 8820)),
        cut: planSlash(ORIGIN, ORIGIN, 0),
        cx: 0,
        cy: 0,
        tx: new Float32Array(STREAM_N),
        ty: new Float32Array(STREAM_N),
        seed: hash01(i, 8821) * Math.PI * 2,
      });
    }
    const swooshes: number[] = [];
    let t = FIRST_CUT_MS;
    let lastEnd = 0;
    for (let k = 0; k < ORDER.length; k++) {
      const p = k / (ORDER.length - 1);
      const sp = spokes[ORDER[k]];
      sp.cx = KNOT.x + sp.dx * sp.length * sp.cutU;
      sp.cy = KNOT.y + sp.dy * sp.length * sp.cutU;
      const side = k % 2 ? CUT_REACH : -CUT_REACH;
      sp.cut = planSlash(
        { x: sp.cx + sp.dy * side, y: sp.cy - sp.dx * side },
        { x: sp.cx - sp.dy * side, y: sp.cy + sp.dx * side },
        t,
        lerp(SWIPE_MS[0], SWIPE_MS[1], p),
      );
      for (let j = 0; j < STREAM_N; j++) {
        const at = readoutSpot(ORIGIN, j + k * 20, 7130);
        sp.tx[j] = at.x;
        sp.ty[j] = at.y;
      }
      swooshes.push(t);
      hit(0, sp.cut.endMs, 0);
      lastEnd = sp.cut.endMs;
      t += lerp(GAPS_MS[0], GAPS_MS[1], p);
    }
    const long = planSlash(
      { x: KNOT.x - LONG_X, y: KNOT.y - LONG_TILT },
      { x: KNOT.x + LONG_X, y: KNOT.y + LONG_TILT },
      lastEnd + LONG_GAP_MS,
      LONG_MS,
    );
    const cross = planSlash(
      { x: KNOT.x + CROSS_X, y: KNOT.y - CROSS_Y },
      { x: KNOT.x - CROSS_X, y: KNOT.y + CROSS_Y },
      long.endMs + CROSS_GAP_MS,
      CROSS_MS,
    );
    swooshes.push(long.startMs, cross.startMs);
    hit(0, long.endMs, 2);
    hit(0, cross.endMs, 1);
    const fx = new Float32Array(BURST_N);
    const fy = new Float32Array(BURST_N);
    const tx = new Float32Array(BURST_N);
    const ty = new Float32Array(BURST_N);
    for (let j = 0; j < BURST_N; j++) {
      fx[j] = KNOT.x + (hash01(j, 7140) * 2 - 1) * SPREAD * 1.6;
      fy[j] = KNOT.y + (hash01(j, 7141) * 2 - 1) * SPREAD * 0.6;
      const at = readoutSpot(ORIGIN, j, 7142);
      tx[j] = at.x;
      ty[j] = at.y;
    }
    states.set(r, {
      spokes,
      finale: [long, cross],
      burstAt: cross.endMs,
      fx,
      fy,
      tx,
      ty,
      swooshes: Float32Array.from(swooshes),
      swooshed: 0,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    while (s.swooshed < s.swooshes.length && s.swooshes[s.swooshed] <= ms) {
      s.swooshed++;
      playSwoosh();
    }
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    ctx.save();
    ctx.translate(to.x, to.y);
    const { spokes, finale, burstAt } = s;

    // the ribbons: taut and quivering, then snapped apart
    let cuts = 0;
    let lastCut = -1;
    for (let i = 0; i < spokes.length; i++) {
      const sp = spokes[i];
      const grown = (ms - sp.growAt) / GROW_MS;
      if (grown <= 0) continue;
      const since = ms - sp.cut.endMs;
      const ax = KNOT.x + sp.dx * sp.length;
      const ay = KNOT.y + sp.dy * sp.length;
      if (since < 0) {
        const e = grown >= 1 ? 1 : 1 - (1 - grown) ** 3;
        const tension = clamp01((ms - sp.growAt) / FIRST_CUT_MS);
        drawRibbon(
          ctx,
          KNOT.x,
          KNOT.y,
          KNOT.x + (ax - KNOT.x) * e,
          KNOT.y + (ay - KNOT.y) * e,
          RIBBON_W,
          1,
          SAG + THRUM * tension * Math.sin(ms * 0.07 + sp.seed),
          1,
          0,
          false,
          SEGS,
        );
        continue;
      }
      cuts++;
      if (sp.cut.endMs > lastCut) lastCut = sp.cut.endMs;
      const recoil = clamp01(since / RECOIL_MS);
      const snap = 1 - (1 - recoil) ** 2;
      if (recoil < 1)
        drawRibbon(
          ctx,
          KNOT.x,
          KNOT.y,
          sp.cx + (KNOT.x - sp.cx) * snap,
          sp.cy + (KNOT.y - sp.cy) * snap,
          RIBBON_W,
          1,
          CURL * Math.sin(Math.PI * recoil),
          CURL_TURNS,
          ms * 0.03,
          true,
          SEGS,
        );
      const slid = since / SLIDE_MS;
      if (slid < 1) {
        const off = SLIDE * slid * (0.5 + 0.5 * slid);
        const back = sp.length * (1 - sp.cutU) * SNAP * snap;
        drawRibbon(
          ctx,
          ax + sp.dx * off,
          ay + sp.dy * off,
          sp.cx + sp.dx * (back + off),
          sp.cy + sp.dy * (back + off),
          RIBBON_W,
          1 - slid * slid,
          CURL * Math.sin(Math.PI * recoil),
          CURL_TURNS,
          ms * 0.03 + sp.seed,
          true,
          SEGS,
        );
      }
    }
    for (let i = 0; i < spokes.length; i++)
      drawSlash(ctx, spokes[i].cut, ms, CUT_W, now);

    // the bow: popping in, swelling and jolting a cut, trembling and
    // glowing up to the burst, slid apart by the finale's cuts, then flung
    const popped = (ms - BOW_AT) / BOW_POP_MS;
    const burst = (ms - burstAt) / BURST_MS;
    const charge = clamp01(ms / burstAt) ** 2;
    let scale = 0;
    if (popped > 0 && burst < 1) {
      const g = Math.min(1, popped) - 1;
      const pop = 1 + 2.7 * g * g * g + 1.7 * g * g;
      const jolt =
        lastCut < 0 ? 0 : JOLT * clamp01(1 - (ms - lastCut) / JOLT_MS);
      scale = pop * (1 + SWELL * cuts + jolt);
      const amp = burst > 0 ? 0 : lerp(TREMBLE[0], TREMBLE[1], charge);
      const ox = KNOT.x + amp * Math.sin(ms * 0.11);
      const oy = KNOT.y + amp * Math.cos(ms * 0.137);
      const fling = burst > 0 ? FLING * burst : 0;
      const alpha = burst > 0 ? 1 - burst : 1;
      for (let i = 0; i < 4; i++) {
        mid.x = KNOT.x + PIECE_X[i];
        mid.y = KNOT.y + PIECE_Y[i];
        sliceOffset(finale, mid, ms, GAP, apart);
        const x = ox + apart.x + PIECE_OUT_X[i] * fling;
        const y = oy + apart.y + PIECE_OUT_Y[i] * fling;
        if (i < 2) drawLoop(ctx, PIECE_SIDE[i], x, y, scale, alpha);
        else
          drawRibbon(
            ctx,
            x,
            y,
            x + PIECE_SIDE[i] * TAIL_X * scale,
            y + TAIL_Y * scale,
            BOW_W,
            alpha,
            TAIL_WAVE * PIECE_SIDE[i],
            1.5,
            ms * 0.02,
            true,
            TAIL_SEGS,
          );
      }
    }
    drawSlash(ctx, finale[0], ms, LONG_W, now);
    drawSlash(ctx, finale[1], ms, CROSS_W, now);
    for (let i = 0; i < spokes.length; i++)
      drawSliceSpill(ctx, spokes[i].cut, ms, SPILL, SPILL_N);
    drawSliceSpill(ctx, finale[0], ms, FIN_SPILL, FIN_SPILL_N);
    drawSliceSpill(ctx, finale[1], ms, FIN_SPILL, FIN_SPILL_N);

    // glows, snap flashes and the glitter streaming up into the total
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (scale > 0 && burst < 0) {
      stampGlimmer(
        ctx,
        KNOT.x,
        KNOT.y,
        lerp(GLOW[0], GLOW[1], charge) * scale,
        ms * 0.004,
        COLOR.heavenlyGold,
      );
      stampGlimmer(
        ctx,
        KNOT.x,
        KNOT.y,
        KNOT_GLOW * scale,
        -ms * 0.006,
        COLOR.white,
      );
    }
    if (burst >= 0 && burst < 1)
      stampGlimmer(
        ctx,
        KNOT.x,
        KNOT.y,
        BURST_FLASH * (1 - burst),
        0,
        COLOR.white,
      );
    for (let i = 0; i < spokes.length; i++) {
      const sp = spokes[i];
      const since = ms - sp.cut.endMs;
      if (since < 0) continue;
      if (since < SNAP_MS)
        stampGlimmer(
          ctx,
          sp.cx,
          sp.cy,
          SNAP_FLASH * (1 - since / SNAP_MS),
          sp.seed,
          COLOR.white,
        );
      if (since > STREAM_MS + LAND_MS + STREAM_N * STREAM_GAP_MS) continue;
      for (let j = 0; j < STREAM_N; j++)
        drawSpeck(
          ctx,
          sp.cx,
          sp.cy,
          sp.tx[j],
          sp.ty[j],
          since - j * STREAM_GAP_MS,
          j + i * 20,
        );
    }
    const burstSince = ms - burstAt;
    if (burstSince >= 0)
      for (let j = 0; j < BURST_N; j++)
        drawSpeck(
          ctx,
          s.fx[j],
          s.fy[j],
          s.tx[j],
          s.ty[j],
          burstSince - j * BURST_GAP_MS,
          j,
        );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    ctx.restore();
    drawFinale(ctx, to, ms - burstAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
