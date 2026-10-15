// Coin Slicer, an income crit: the number shrinks away and big gold coins
// are flipped up spinning from under the total, one after another then
// several at once, faster and denser; a 60-80ms swipe slices each at the top
// of its flip, the halves sliding apart and tumbling off as glitter spills
// and showers up into the readout, a share and a flash each cut. The finale:
// a giant coin flips up, trembles and glows at the top as glitter is pulled
// in, and is cut in a cross, its quarters flung apart in the huge blast as
// its glitter floods the total
import { COLOR } from "../../../../palette";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  sliceOffset,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import { drawSpinCoin, loadSpinCoin } from "../../../../shared/coinFlip";
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

loadSpinCoin();

// the waves of coins: how many each, the first from FIRST_MS, WAVE_GAPS_MS
// apart (closing), the coins of a wave IN_WAVE_MS apart
const WAVES = [1, 1, 1, 2, 2, 3];
const FIRST_MS = 70;
const WAVE_GAPS_MS: [number, number] = [210, 95];
const IN_WAVE_MS = 35;
// a flip from START_Y under the readout up to PEAK_Y over UP_MS (quickening),
// spinning SPIN radians a ms, face on at the cut; lanes LANE apart
const START_Y = 420;
const PEAK_Y: [number, number] = [140, 200];
const UP_MS: [number, number] = [220, 160];
const SPIN = 0.035;
const R = 58;
const LANE = 300;
const SINGLE_X: [number, number] = [120, 300];
const IN_MS = 40;
// the cut through the coin at its peak, REACH px either side, SWIPE_MS
// (closing), ANGLE rad off level either way
const SWIPE_MS: [number, number] = [80, 60];
const REACH = 110;
const ANGLE: [number, number] = [0.3, 1.1];
const CUT_W = 20;
const SPILL = 16;
const SPILL_N = 10;
// the halves sliding GAP apart over APART_MS, then drifting DRIFT more,
// dropping FALL and tumbling TUMBLE rad over HALF_MS as they fade
const GAP = 14;
const APART_MS = 80;
const DRIFT = 120;
const FALL = 140;
const TUMBLE = 1.4;
const HALF_MS = 320;
const FLASH = 120;
const FLASH_MS = 120;
// glitter showering up into the total: STREAM_N specks STREAM_GAP_MS apart,
// each crossing in STREAM_MS, arcing LIFT px over, flashing LAND on landing
const STREAM_N = 8;
const STREAM_GAP_MS = 12;
const STREAM_MS = 220;
const LIFT = 90;
const SPECK = 18;
const LAND = 42;
const LAND_MS = 110;
// the giant coin: launched FIN_AFTER_MS after the last coin, up from START_Y
// to FIN_PEAK_Y over FIN_UP_MS, swelling FIN_R and trembling TREMBLE px with
// a GLOW for TREMBLE_MS, glitter pulled in from PULL out
const FIN_AFTER_MS = 120;
const FIN_PEAK_Y = 150;
const FIN_UP_MS = 230;
const FIN_R: [number, number] = [120, 150];
const TREMBLE_MS = 240;
const TREMBLE: [number, number] = [2, 14];
const GLOW: [number, number] = [160, 340];
const PULL_N = 18;
const PULL = 280;
const PULL_RATE = 0.006;
const PULL_SPECK = 22;
// the cross: two cuts CROSS_REACH either side, CROSS_MS each, CROSS_GAP_MS
// apart, the first CROSS_ANGLE off level
const CROSS_REACH = 260;
const CROSS_MS = 70;
const CROSS_GAP_MS = 30;
const CROSS_ANGLE = -0.55;
const CROSS_W = 44;
const FIN_SPILL = 30;
const FIN_SPILL_N = 20;
// the quarters sliding FIN_GAP apart along the cuts, then flung FLING out,
// tumbling, over BURST_MS; BURST_N specks streaming up from round the coin
const FIN_GAP = 22;
const FLING = 520;
const FIN_TUMBLE = 2.2;
const BURST_MS = 300;
const BURST_FLASH = 280;
const BURST_N = 36;
const BURST_GAP_MS = 4;
// shakes by step: a cut, the cross
const SHAKES = [0.7, 3.2];

interface Coin {
  launchAt: number;
  upMs: number;
  x0: number;
  x: number;
  y: number;
  cut: Slash;
  angle: number;
  seed: number;
  tx: Float32Array;
  ty: Float32Array;
}
interface State {
  coins: Coin[];
  finLaunch: number;
  peakAt: number;
  cross: Slash[];
  burstAt: number;
  fx: Float32Array;
  fy: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  swooshes: Float32Array;
  swooshed: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

// the quarters of the giant coin in the first cut's frame: x along it, y
// along its normal
const QX = [1, -1, -1, 1];
const QY = [1, 1, -1, -1];
const mid: Point = { x: 0, y: 0 };
const apart: Point = { x: 0, y: 0 };

// the coin at (x, y) clipped to the rect (rx, ry, rw, rh) of the frame turned
// `angle`, the piece turned `tumble` more
function drawPiece(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  tumble: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + tumble);
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.rotate(-angle);
  drawSpinCoin(ctx, 0, 0, radius, alpha, 0);
  ctx.restore();
}

// a speck showering from (fx, fy) up onto (tx, ty) `since` ms on, then its
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

registerFloorCrit("coinSlicerCrit", {
  plan(r, _bars, hit) {
    const coins: Coin[] = [];
    const swooshes: number[] = [];
    let t = FIRST_MS;
    let lastLaunch = 0;
    for (let w = 0; w < WAVES.length; w++) {
      const p = w / (WAVES.length - 1);
      const n = WAVES[w];
      for (let k = 0; k < n; k++) {
        const i = coins.length;
        const launchAt = t + k * IN_WAVE_MS;
        const upMs = lerp(UP_MS[0], UP_MS[1], p);
        const x =
          n === 1
            ? (i % 2 ? 1 : -1) * lerp(SINGLE_X[0], SINGLE_X[1], hash01(i, 6610))
            : (k - (n - 1) / 2) * LANE + (hash01(i, 6611) - 0.5) * 60;
        const y = lerp(PEAK_Y[0], PEAK_Y[1], hash01(i, 6612));
        const a = (i % 2 ? 1 : -1) * lerp(ANGLE[0], ANGLE[1], hash01(i, 6613));
        const dx = Math.cos(a) * REACH * (k % 2 ? -1 : 1);
        const dy = Math.sin(a) * REACH * (k % 2 ? -1 : 1);
        const swipe = lerp(SWIPE_MS[0], SWIPE_MS[1], p);
        const peakAt = launchAt + upMs;
        const cut = planSlash(
          { x: x - dx, y: y - dy },
          { x: x + dx, y: y + dy },
          peakAt - swipe / 2,
          swipe,
        );
        const tx = new Float32Array(STREAM_N);
        const ty = new Float32Array(STREAM_N);
        for (let j = 0; j < STREAM_N; j++) {
          const at = readoutSpot(ORIGIN, j + i * 20, 6620);
          tx[j] = at.x;
          ty[j] = at.y;
        }
        coins.push({
          launchAt,
          upMs,
          x0: x * 0.7,
          x,
          y,
          cut,
          angle: Math.atan2(cut.to.y - cut.from.y, cut.to.x - cut.from.x),
          seed: hash01(i, 6614),
          tx,
          ty,
        });
        swooshes.push(cut.startMs);
        hit(0, cut.endMs, 0);
        lastLaunch = launchAt;
      }
      t += lerp(WAVE_GAPS_MS[0], WAVE_GAPS_MS[1], p);
    }
    const finLaunch = lastLaunch + FIN_AFTER_MS;
    const peakAt = finLaunch + FIN_UP_MS;
    const cx = Math.cos(CROSS_ANGLE) * CROSS_REACH;
    const cy = Math.sin(CROSS_ANGLE) * CROSS_REACH;
    const first = planSlash(
      { x: -cx, y: FIN_PEAK_Y - cy },
      { x: cx, y: FIN_PEAK_Y + cy },
      peakAt + TREMBLE_MS,
      CROSS_MS,
    );
    const second = planSlash(
      { x: -cy, y: FIN_PEAK_Y + cx },
      { x: cy, y: FIN_PEAK_Y - cx },
      first.endMs + CROSS_GAP_MS,
      CROSS_MS,
    );
    swooshes.push(first.startMs, second.startMs);
    hit(0, second.endMs, 1);
    const fx = new Float32Array(BURST_N);
    const fy = new Float32Array(BURST_N);
    const tx = new Float32Array(BURST_N);
    const ty = new Float32Array(BURST_N);
    for (let j = 0; j < BURST_N; j++) {
      const a = hash01(j, 6630) * Math.PI * 2;
      const d = FIN_R[1] * Math.sqrt(hash01(j, 6631));
      fx[j] = Math.cos(a) * d;
      fy[j] = FIN_PEAK_Y + Math.sin(a) * d;
      const at = readoutSpot(ORIGIN, j, 6632);
      tx[j] = at.x;
      ty[j] = at.y;
    }
    states.set(r, {
      coins,
      finLaunch,
      peakAt,
      cross: [first, second],
      burstAt: second.endMs,
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
    const { coins, cross, burstAt, peakAt } = s;

    // the coins: flipped up spinning, then sliced, the halves sliding apart
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      const up = (ms - c.launchAt) / c.upMs;
      if (up <= 0) continue;
      const since = ms - c.cut.endMs;
      if (since < 0) {
        const e = up >= 1 ? 1 : 1 - (1 - up) ** 2;
        drawSpinCoin(
          ctx,
          lerp(c.x0, c.x, e),
          lerp(START_Y, c.y, e),
          R,
          clamp01((ms - c.launchAt) / IN_MS),
          Math.min(0, ms - c.cut.endMs) * SPIN,
        );
        continue;
      }
      const h = since / HALF_MS;
      if (h >= 1) continue;
      const off = GAP * clamp01(since / APART_MS) + DRIFT * h;
      const drop = FALL * h * h;
      const alpha = 1 - h * h;
      const n = c.cut.n;
      drawPiece(
        ctx,
        c.x + n.x * off,
        c.y + n.y * off + drop,
        R,
        c.angle,
        TUMBLE * h,
        -R,
        0,
        R * 2,
        R,
        alpha,
      );
      drawPiece(
        ctx,
        c.x - n.x * off,
        c.y - n.y * off + drop,
        R,
        c.angle,
        -TUMBLE * h,
        -R,
        -R,
        R * 2,
        R,
        alpha,
      );
    }
    for (let i = 0; i < coins.length; i++)
      drawSlash(ctx, coins[i].cut, ms, CUT_W, now);

    // the giant coin: flipped up, trembling and swelling at the top, cut in
    // the cross, its quarters flung apart in the burst
    const finUp = (ms - s.finLaunch) / FIN_UP_MS;
    const burst = (ms - burstAt) / BURST_MS;
    const charge = clamp01((ms - peakAt) / TREMBLE_MS);
    const finR = lerp(FIN_R[0], FIN_R[1], charge * charge);
    if (finUp > 0 && burst < 1) {
      const first = cross[0];
      if (ms < first.endMs) {
        const e = finUp >= 1 ? 1 : 1 - (1 - finUp) ** 2;
        const amp = lerp(TREMBLE[0], TREMBLE[1], charge) * (finUp >= 1 ? 1 : 0);
        drawSpinCoin(
          ctx,
          amp * Math.sin(ms * 0.11),
          lerp(START_Y, FIN_PEAK_Y, e) + amp * Math.cos(ms * 0.137),
          finR,
          clamp01((ms - s.finLaunch) / IN_MS),
          Math.min(0, ms - first.startMs) * SPIN,
        );
      } else {
        const fling = burst > 0 ? FLING * burst * (0.6 + 0.4 * burst) : 0;
        const alpha = burst > 0 ? 1 - burst * burst : 1;
        const ca = Math.cos(CROSS_ANGLE);
        const sa = Math.sin(CROSS_ANGLE);
        for (let q = 0; q < 4; q++) {
          // the quarter's middle: along the first cut, then its normal
          const lx = (QX[q] * finR) / 2;
          const ly = (QY[q] * finR) / 2;
          const ox = lx * ca - ly * sa;
          const oy = lx * sa + ly * ca;
          mid.x = ox;
          mid.y = FIN_PEAK_Y + oy;
          sliceOffset(cross, mid, ms, FIN_GAP, apart);
          const l = Math.hypot(ox, oy) || 1;
          drawPiece(
            ctx,
            apart.x + (ox / l) * fling,
            FIN_PEAK_Y + apart.y + (oy / l) * fling,
            finR,
            CROSS_ANGLE,
            burst > 0 ? QX[q] * QY[q] * FIN_TUMBLE * burst : 0,
            QX[q] > 0 ? 0 : -finR,
            QY[q] > 0 ? 0 : -finR,
            finR,
            finR,
            alpha,
          );
        }
      }
    }
    drawSlash(ctx, cross[0], ms, CROSS_W, now);
    drawSlash(ctx, cross[1], ms, CROSS_W, now);
    for (let i = 0; i < coins.length; i++)
      drawSliceSpill(ctx, coins[i].cut, ms, SPILL, SPILL_N);
    drawSliceSpill(ctx, cross[0], ms, FIN_SPILL, FIN_SPILL_N);
    drawSliceSpill(ctx, cross[1], ms, FIN_SPILL, FIN_SPILL_N);

    // cut flashes, the giant coin's glow and pull, the glitter showering up
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (charge > 0 && burst < 0) {
      stampGlimmer(
        ctx,
        0,
        FIN_PEAK_Y,
        lerp(GLOW[0], GLOW[1], charge),
        ms * 0.004,
        COLOR.heavenlyGold,
      );
      if (ms < cross[0].startMs)
        for (let j = 0; j < PULL_N; j++) {
          const p = ((ms - peakAt) * PULL_RATE + hash01(j, 6640)) % 1;
          const a = hash01(j, 6641) * Math.PI * 2 + p * 1.5;
          const d = PULL * (1 - p) ** 1.5;
          stampGlimmer(
            ctx,
            Math.cos(a) * d,
            FIN_PEAK_Y + Math.sin(a) * d,
            PULL_SPECK * (1 - 0.5 * p),
            j,
            j % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
    }
    if (burst >= 0 && burst < 1)
      stampGlimmer(
        ctx,
        0,
        FIN_PEAK_Y,
        BURST_FLASH * (1 - burst),
        0,
        COLOR.white,
      );
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      const since = ms - c.cut.endMs;
      if (since < 0) continue;
      if (since < FLASH_MS)
        stampGlimmer(
          ctx,
          c.x,
          c.y,
          FLASH * (1 - since / FLASH_MS),
          c.seed,
          COLOR.white,
        );
      if (since > STREAM_MS + LAND_MS + STREAM_N * STREAM_GAP_MS) continue;
      for (let j = 0; j < STREAM_N; j++)
        drawSpeck(
          ctx,
          c.x,
          c.y,
          c.tx[j],
          c.ty[j],
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
    drawFinale(ctx, to, burstSince, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
