// Claw Marks, an income crit: the number shrinks away and an unseen cat
// swipes at the total, from one side then the other, faster and faster; each
// swipe is three parallel curved claws of light raking across the readout in
// 60-80ms, leaving three glowing gashes whose edges split and slide apart as
// glitter spills, a jolt and a share each swipe. The finale: a pause, light
// gathering trembling on the readout as both paws glint, then two huge
// three-claw swipes cross in an X, the gashes bursting into flung shards with
// the last share, the big blast and the hardest shake
import { COLOR } from "../../../../palette";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawNumberShrink } from "../shared";

// the swipes: SWIPES of them from FIRST_MS, GAPS_MS apart (closing), each
// SWIPE_MS (closing), the outer claws CLAW_LAG_MS behind the middle one
const SWIPES = 6;
const FIRST_MS = 90;
const GAPS_MS: [number, number] = [190, 100];
const SWIPE_MS: [number, number] = [80, 60];
const CLAW_LAG_MS = 10;
// a swipe's reach SPAN_X/SPAN_Y either side of its middle (jittered by
// CENTRE_JIT/Y_JIT), growing SCALE, bowed BOW, its claws CLAW_GAP apart
const SPAN_X: [number, number] = [200, 250];
const SPAN_Y: [number, number] = [55, 75];
const CENTRE_JIT = 90;
const Y_JIT = 14;
const SCALE: [number, number] = [0.9, 1.15];
const BOW = 38;
const CLAW_GAP = 30;
// a claw's streak: GLOW_W wide glow round a CORE_W core, its tip flaring TIP
const GLOW_W = 20;
const CORE_W = 6;
const TIP = 34;
// a gash: its edges splitting GASH_GAP apart over APART_MS, then drifting
// GASH_DRIFT more and sliding SLIDE along it, fading over GASH_MS
const GASH_MS = 420;
const APART_MS = 80;
const GASH_GAP = 7;
const GASH_DRIFT = 10;
const SLIDE = 14;
const EDGE_W = 3.5;
const EDGE_GLOW_W = 10;
// glitter spilling from each gash: SPILL_N specks of SPILL px over SPILL_MS,
// scattered SCATTER either side, dropping SPILL_FALL
const SPILL_MS = 480;
const SPILL_N = 6;
const SPILL = 16;
const SCATTER = 18;
const SPILL_FALL = 150;
// each swipe's flash as it's through
const FLASH = 130;
const FLASH_MS = 110;
// the finale: PAUSE_MS after the last swipe, CHARGE_MS of light gathering on
// the readout (GLOW, trembling TREMBLE px) with PULL_N specks pulled in from
// PULL, both paws glinting PAW px at their swipes' starts
const PAUSE_MS = 130;
const CHARGE_MS = 380;
const GLOW: [number, number] = [50, 260];
const TREMBLE: [number, number] = [1, 10];
const PULL_N = 22;
const PULL = 300;
const PULL_RATE = 0.0065;
const PULL_SPECK = 22;
const PAW: [number, number] = [8, 44];
// the X: two swipes BIG_X/BIG_Y either side, X_MS each, the second X_LAG_MS
// after the first, claws BIG_GAP apart, everything BIG_W thicker
const BIG_X = 330;
const BIG_Y = 120;
const BIG_BOW = 60;
const BIG_GAP = 54;
const BIG_W = 1.9;
const X_MS = 75;
const X_LAG_MS = 35;
// the burst: each X claw broken in SHARDS flung FLING out, falling
// SHARD_FALL, spinning SHARD_SPIN over SHARD_MS; BURST_N specks out to BURST_D
const SHARDS = 4;
const FLING = 420;
const SHARD_FALL = 120;
const SHARD_SPIN = 2.4;
const SHARD_MS = 340;
const BURST_N = 32;
const BURST_D: [number, number] = [120, 520];
const BURST_SPECK = 26;
const BURST_FLASH = 300;
const BLAST = 460;
const ECHO_MS = 90;
const ECHO = 260;
// shakes by step: a swipe, the X
const SHAKES = [0.8, 3.4];

interface Claw {
  ax: number;
  ay: number;
  cx: number;
  cy: number;
  bx: number;
  by: number;
  // unit normal and tangent of its chord
  nx: number;
  ny: number;
  tx: number;
  ty: number;
  startMs: number;
  endMs: number;
  w: number;
  big: boolean;
}
interface State {
  claws: Claw[];
  // per swipe: its middle claw's chord middle and when it's through
  flashX: Float32Array;
  flashY: Float32Array;
  flashAt: Float32Array;
  chargeAt: number;
  xStart: number;
  burstAt: number;
  // the shards: middle, half-vector, outward unit, spin sign
  sx: Float32Array;
  sy: Float32Array;
  hx: Float32Array;
  hy: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  spin: Float32Array;
  bx: Float32Array;
  by: Float32Array;
  swooshes: Float32Array;
  swooshed: number;
}
const states = new WeakMap<Running, State>();

// three parallel claws of a swipe from (ax, ay) to (bx, by), bowed `bow`
function addSwipe(
  claws: Claw[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bow: number,
  gap: number,
  startMs: number,
  swipeMs: number,
  w: number,
  big: boolean,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const l = Math.hypot(dx, dy) || 1;
  const tx = dx / l;
  const ty = dy / l;
  let nx = -ty;
  let ny = tx;
  // bow downwards, like a paw's arc
  const sag = ny >= 0 ? bow : -bow;
  const mx = (ax + bx) / 2 + nx * sag;
  const my = (ay + by) / 2 + ny * sag;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const clawMs = Math.max(20, swipeMs - CLAW_LAG_MS);
  for (let k = -1; k <= 1; k++) {
    const o = k * gap;
    // the middle claw reaches a little further
    const reach = k === 0 ? 0.06 * l : 0;
    const lag = k === 0 ? 0 : CLAW_LAG_MS;
    claws.push({
      ax: ax + nx * o - tx * reach,
      ay: ay + ny * o - ty * reach,
      cx: mx + nx * o,
      cy: my + ny * o,
      bx: bx + nx * o + tx * reach,
      by: by + ny * o + ty * reach,
      nx,
      ny,
      tx,
      ty,
      startMs: startMs + lag,
      endMs: startMs + lag + clawMs,
      w,
      big,
    });
  }
}

// the claw's curve shifted (ox, oy), drawn up to u of the way along
function traceClaw(
  ctx: CanvasRenderingContext2D,
  c: Claw,
  ox: number,
  oy: number,
  u: number,
): void {
  const ax = c.ax + ox;
  const ay = c.ay + oy;
  ctx.moveTo(ax, ay);
  if (u >= 1) {
    ctx.quadraticCurveTo(c.cx + ox, c.cy + oy, c.bx + ox, c.by + oy);
    return;
  }
  const v = 1 - u;
  ctx.quadraticCurveTo(
    ax + (c.cx + ox - ax) * u,
    ay + (c.cy + oy - ay) * u,
    v * v * ax + 2 * u * v * (c.cx + ox) + u * u * (c.bx + ox),
    v * v * ay + 2 * u * v * (c.cy + oy) + u * u * (c.by + oy),
  );
}

const qx = (c: Claw, t: number): number => {
  const v = 1 - t;
  return v * v * c.ax + 2 * t * v * c.cx + t * t * c.bx;
};
const qy = (c: Claw, t: number): number => {
  const v = 1 - t;
  return v * v * c.ay + 2 * t * v * c.cy + t * t * c.by;
};

registerFloorCrit("clawMarksCrit", {
  plan(r, _bars, hit) {
    const claws: Claw[] = [];
    const swooshes: number[] = [];
    const flashX = new Float32Array(SWIPES);
    const flashY = new Float32Array(SWIPES);
    const flashAt = new Float32Array(SWIPES);
    let t = FIRST_MS;
    let lastEnd = t;
    for (let i = 0; i < SWIPES; i++) {
      const p = i / (SWIPES - 1);
      // from the left, then the right, and so on
      const dir = i % 2 ? -1 : 1;
      const scale = lerp(SCALE[0], SCALE[1], p);
      const sx = lerp(SPAN_X[0], SPAN_X[1], hash01(i, 7110)) * scale;
      const sy = lerp(SPAN_Y[0], SPAN_Y[1], hash01(i, 7111)) * scale;
      const mx = (hash01(i, 7112) - 0.5) * 2 * CENTRE_JIT;
      const my = (hash01(i, 7113) - 0.5) * 2 * Y_JIT;
      const swipeMs = lerp(SWIPE_MS[0], SWIPE_MS[1], p);
      addSwipe(
        claws,
        mx - dir * sx,
        my - sy,
        mx + dir * sx,
        my + sy,
        BOW * scale,
        CLAW_GAP * scale,
        t,
        swipeMs,
        scale,
        false,
      );
      const end = t + swipeMs;
      flashX[i] = mx;
      flashY[i] = my;
      flashAt[i] = end;
      swooshes.push(t);
      hit(0, end, 0);
      lastEnd = end;
      t += lerp(GAPS_MS[0], GAPS_MS[1], p);
    }
    const chargeAt = lastEnd + PAUSE_MS;
    const xStart = chargeAt + CHARGE_MS;
    const firstBig = claws.length;
    addSwipe(
      claws,
      -BIG_X,
      -BIG_Y,
      BIG_X,
      BIG_Y,
      BIG_BOW,
      BIG_GAP,
      xStart,
      X_MS,
      BIG_W,
      true,
    );
    addSwipe(
      claws,
      BIG_X,
      -BIG_Y,
      -BIG_X,
      BIG_Y,
      BIG_BOW,
      BIG_GAP,
      xStart + X_LAG_MS,
      X_MS,
      BIG_W,
      true,
    );
    let burstAt = xStart;
    for (let i = firstBig; i < claws.length; i++)
      burstAt = Math.max(burstAt, claws[i].endMs);
    swooshes.push(xStart, xStart + X_LAG_MS);
    hit(0, burstAt, 1);

    const n = (claws.length - firstBig) * SHARDS;
    const sx = new Float32Array(n);
    const sy = new Float32Array(n);
    const hx = new Float32Array(n);
    const hy = new Float32Array(n);
    const ox = new Float32Array(n);
    const oy = new Float32Array(n);
    const spin = new Float32Array(n);
    let j = 0;
    for (let i = firstBig; i < claws.length; i++) {
      const c = claws[i];
      for (let s = 0; s < SHARDS; s++, j++) {
        const t0 = s / SHARDS;
        const t1 = (s + 1) / SHARDS;
        const x0 = qx(c, t0);
        const y0 = qy(c, t0);
        const x1 = qx(c, t1);
        const y1 = qy(c, t1);
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;
        sx[j] = mx;
        sy[j] = my;
        hx[j] = (x1 - x0) / 2;
        hy[j] = (y1 - y0) / 2;
        const l = Math.hypot(mx, my);
        ox[j] = l > 1 ? mx / l : c.nx;
        oy[j] = l > 1 ? my / l : c.ny;
        spin[j] = (hash01(j, 7120) - 0.5) * 2;
      }
    }
    const bx = new Float32Array(BURST_N);
    const by = new Float32Array(BURST_N);
    for (let k = 0; k < BURST_N; k++) {
      const a = (k / BURST_N) * Math.PI * 2 + hash01(k, 7130) * 0.4;
      const d = lerp(BURST_D[0], BURST_D[1], hash01(k, 7131));
      bx[k] = Math.cos(a) * d;
      by[k] = Math.sin(a) * d * 0.55;
    }
    states.set(r, {
      claws,
      flashX,
      flashY,
      flashAt,
      chargeAt,
      xStart,
      burstAt,
      sx,
      sy,
      hx,
      hy,
      ox,
      oy,
      spin,
      bx,
      by,
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
    const { claws, burstAt, chargeAt, xStart } = s;
    drawNumberShrink(ctx, r, ms);
    ctx.save();
    ctx.translate(to.x, to.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    // the claws raking, then their gashes splitting open
    for (let i = 0; i < claws.length; i++) {
      const c = claws[i];
      if (ms < c.startMs) continue;
      if (c.big && ms >= burstAt) continue;
      const w = c.w;
      if (ms < c.endMs) {
        const u = (ms - c.startMs) / (c.endMs - c.startMs);
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.lineWidth = GLOW_W * w;
        ctx.beginPath();
        traceClaw(ctx, c, 0, 0, u);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = COLOR.white;
        ctx.lineWidth = CORE_W * w;
        ctx.beginPath();
        traceClaw(ctx, c, 0, 0, u);
        ctx.stroke();
        continue;
      }
      const since = ms - c.endMs;
      const h = since / GASH_MS;
      if (h >= 1) continue;
      const fade = 1 - h;
      const gap = (GASH_GAP * clamp01(since / APART_MS) + GASH_DRIFT * h) * w;
      const slide = SLIDE * h * w;
      const ex = c.nx * gap + c.tx * slide;
      const ey = c.ny * gap + c.ty * slide;
      ctx.globalAlpha = 0.4 * fade;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.lineWidth = Math.max(1, gap * 2 + CORE_W * w * fade);
      ctx.beginPath();
      traceClaw(ctx, c, 0, 0, 1);
      ctx.stroke();
      ctx.globalAlpha = 0.6 * fade;
      ctx.lineWidth = EDGE_GLOW_W * w;
      ctx.beginPath();
      traceClaw(ctx, c, ex, ey, 1);
      traceClaw(ctx, c, -ex, -ey, 1);
      ctx.stroke();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = EDGE_W * w;
      ctx.stroke();
    }

    // the X's shards flung apart in the burst
    const b = (ms - burstAt) / SHARD_MS;
    if (b >= 0 && b < 1) {
      const e = 1 - (1 - b) * (1 - b);
      const fall = SHARD_FALL * b * b;
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass ? 1 : 0.6) * (1 - b * b);
        ctx.strokeStyle = pass ? COLOR.white : COLOR.heavenlyGold;
        ctx.lineWidth = pass ? CORE_W * BIG_W : GLOW_W * BIG_W;
        ctx.beginPath();
        for (let j = 0; j < s.sx.length; j++) {
          const a = s.spin[j] * SHARD_SPIN * b;
          const co = Math.cos(a);
          const si = Math.sin(a);
          const hx = s.hx[j] * co - s.hy[j] * si;
          const hy = s.hx[j] * si + s.hy[j] * co;
          const px = s.sx[j] + s.ox[j] * FLING * e;
          const py = s.sy[j] + s.oy[j] * FLING * e + fall;
          ctx.moveTo(px - hx, py - hy);
          ctx.lineTo(px + hx, py + hy);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // tips, flashes, spilled glitter, the gathering light and the burst
    beginLightBatch(ctx);
    for (let i = 0; i < claws.length; i++) {
      const c = claws[i];
      if (ms < c.startMs) continue;
      if (ms < c.endMs) {
        const u = (ms - c.startMs) / (c.endMs - c.startMs);
        stampGlimmer(ctx, qx(c, u), qy(c, u), TIP * c.w, i, COLOR.white);
        continue;
      }
      const since = ms - c.endMs;
      if (since >= SPILL_MS) continue;
      const t = since / SPILL_MS;
      const size = SPILL * c.w * (1 - t);
      const fall = SPILL_FALL * t * t;
      for (let j = 0; j < SPILL_N; j++) {
        const v = (j + 0.5) / SPILL_N;
        const side =
          (hash01(j + i * 8, 7140) - 0.5) * 2 * SCATTER * c.w * (0.4 + t);
        stampGlimmer(
          ctx,
          qx(c, v) + c.nx * side,
          qy(c, v) + c.ny * side + fall,
          size,
          j + i * 8,
          j % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    for (let i = 0; i < SWIPES; i++) {
      const since = ms - s.flashAt[i];
      if (since >= 0 && since < FLASH_MS)
        stampGlimmer(
          ctx,
          s.flashX[i],
          s.flashY[i],
          FLASH * (1 - since / FLASH_MS),
          i,
          COLOR.white,
        );
    }
    const charge = clamp01((ms - chargeAt) / CHARGE_MS);
    if (ms >= chargeAt && ms < burstAt) {
      const c2 = charge * charge;
      const amp = lerp(TREMBLE[0], TREMBLE[1], charge);
      stampGlimmer(
        ctx,
        amp * Math.sin(ms * 0.11),
        amp * Math.cos(ms * 0.137),
        lerp(GLOW[0], GLOW[1], c2),
        ms * 0.004,
        COLOR.heavenlyGold,
      );
      if (ms < xStart) {
        for (let j = 0; j < PULL_N; j++) {
          const p = ((ms - chargeAt) * PULL_RATE + hash01(j, 7150)) % 1;
          const a = hash01(j, 7151) * Math.PI * 2 + p * 1.5;
          const d = PULL * (1 - p) ** 1.5;
          stampGlimmer(
            ctx,
            Math.cos(a) * d,
            Math.sin(a) * d * 0.6,
            PULL_SPECK * (1 - 0.5 * p),
            j,
            j % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
        // both paws glinting at their swipes' starts
        const paw = lerp(PAW[0], PAW[1], c2);
        for (let i = claws.length - 6; i < claws.length; i++) {
          if (i < 0) continue;
          const c = claws[i];
          stampGlimmer(
            ctx,
            c.ax + amp * Math.sin(ms * 0.13 + i),
            c.ay + amp * Math.cos(ms * 0.17 + i),
            paw,
            i + ms * 0.003,
            i % 2 ? COLOR.white : COLOR.heavenlyGold,
          );
        }
      }
    }
    const burstSince = ms - burstAt;
    if (burstSince >= 0 && burstSince < SHARD_MS) {
      const t = burstSince / SHARD_MS;
      const e = 1 - (1 - t) * (1 - t);
      stampGlimmer(ctx, 0, 0, BURST_FLASH * (1 - t), 0, COLOR.white);
      for (let k = 0; k < BURST_N; k++)
        stampGlimmer(
          ctx,
          s.bx[k] * e,
          s.by[k] * e,
          BURST_SPECK * (1 - t),
          k,
          k % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
    }
    endLightBatch(ctx);
    ctx.restore();
    if (burstSince >= 0) {
      drawDetonation(ctx, to, burstSince, BLAST, now);
      drawDetonation(ctx, to, burstSince - ECHO_MS, ECHO, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
