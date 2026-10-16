// Cleaver, an income crit: the number shrinks away and fat bundles of green
// banknotes are tossed up beside the total, one after another, faster and
// faster; at the top of each toss a heavy glowing cleaver of light chops it
// in a 60-80ms swipe, the halves sliding apart and tumbling off as loose bills
// and glitter spill up into the readout, a jolt and a share each chop. The
// finale: a whole stack of bundles is tossed at once, hangs trembling and
// glowing as glitter is pulled in, and the cleaver chops a cross through it,
// the quarters bursting apart and their bills flooding the total in the big
// blast
import { COLOR } from "../../../../palette";
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
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { billFrames, drawNumberShrink, readoutSpot } from "../shared";

// the bundle: BW x BH px, its notes' edges THICK px below, drawn at 2x once
const BW = 120;
const BH = 56;
const THICK = 8;
const PAD = 5;
const SPR_W = BW + PAD * 2;
const SPR_H = BH + THICK + PAD * 2;
// the tosses: TOSSES bundles, the first at FIRST_MS, TOSS_GAPS_MS apart
// (closing), up from START_Y to a peak in PEAK_Y over UP_MS (quickening),
// spinning SPIN rad on the way, lanes SIDE_X out either side of the total
const TOSSES = 7;
const FIRST_MS = 50;
const TOSS_GAPS_MS: [number, number] = [180, 80];
const START_Y = 430;
const PEAK_Y: [number, number] = [115, 175];
const UP_MS: [number, number] = [230, 150];
const SPIN = 2.4;
const SIDE_X: [number, number] = [170, 320];
const IN_MS = 40;
// the chop: down through the bundle at its peak, REACH px either side,
// SWIPE_MS (closing), TILT rad off upright
const SWIPE_MS: [number, number] = [80, 60];
const REACH = 120;
const TILT: [number, number] = [0.15, 0.45];
const CUT_W = 18;
const SPILL = 14;
const SPILL_N = 10;
// the halves sliding GAP apart over APART_MS, then drifting DRIFT more,
// dropping FALL and tumbling TUMBLE rad over HALF_MS as they fade
const GAP = 16;
const APART_MS = 80;
const DRIFT = 110;
const FALL = 160;
const TUMBLE = 1.2;
const HALF_MS = 340;
const CLIP = 220;
const FLASH = 130;
const FLASH_MS = 120;
// the cleaver: blade BLADE_L long, BLADE_D deep, a HANDLE_L handle; raised
// LEAD_MS before its swipe, pulled back WIND px, fading over FADE_MS after
const BLADE_L = 150;
const BLADE_D = 62;
const HANDLE_L = 58;
const LEAD_MS = 50;
const WIND = 30;
const FADE_MS = 90;
const CLEAVER = 1;
const BIG_CLEAVER = 1.8;
// what spills into the total each chop: BILL_N bills and STREAM_N specks,
// STREAM_GAP_MS apart, each crossing in FLY_MS, arcing LIFT px over
const BILL_N = 4;
const STREAM_N = 7;
const SPOTS = BILL_N + STREAM_N;
const STREAM_GAP_MS = 14;
const FLY_MS = 240;
const LIFT = 90;
const BILL_W = 54;
const BILL_FLIP = 0.03;
const SPECK = 18;
const LAND = 42;
const LAND_MS = 110;
// the stack: STACK bundles STACK_STEP px apart, launched FIN_AFTER_MS after
// the last toss, up to FIN_Y over FIN_UP_MS, trembling TREMBLE px with a
// GLOW for CHARGE_MS as glitter is pulled in from PULL out
const STACK = 5;
const STACK_STEP = 36;
const FIN_AFTER_MS = 90;
const FIN_Y = 210;
const FIN_UP_MS = 210;
const CHARGE_MS = 210;
const TREMBLE: [number, number] = [2, 12];
const GLOW: [number, number] = [150, 320];
const PULL_N = 18;
const PULL = 300;
const PULL_RATE = 0.006;
const PULL_SPECK = 22;
// the cross: two chops CROSS_REACH either side, CROSS_MS each, CROSS_GAP_MS
// apart, the first CROSS_ANGLE off level
const CROSS_REACH = 250;
const CROSS_MS = 70;
const CROSS_GAP_MS = 25;
const CROSS_ANGLE = -0.7;
const CROSS_W = 42;
const FIN_SPILL = 28;
const FIN_SPILL_N = 18;
// the quarters sliding FIN_GAP apart, then flung FLING out, tumbling, over
// BURST_MS; BURST_N specks and BURST_BILLS bills flooding the total
const FIN_GAP = 22;
const FLING = 460;
const FIN_TUMBLE = 0.9;
const QUARTER = 300;
const BURST_MS = 300;
const BURST_FLASH = 280;
const BURST_N = 32;
const BURST_BILLS = 14;
const BURST_GAP_MS = 5;
const FINALE_BLAST = 440;
const STACK_BLAST = 240;
// shakes by step: a chop, the cross
const SHAKES = [0.8, 3.4];

// a rounded rect path, for the sprite
function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

// the bundle sprite, built once: stacked notes, the top one, a paper band
const bundle = document.createElement("canvas");
{
  bundle.width = SPR_W * 2;
  bundle.height = SPR_H * 2;
  const c = bundle.getContext("2d")!;
  c.scale(2, 2);
  c.translate(PAD, PAD);
  c.lineJoin = "round";
  for (let i = 4; i >= 1; i--) {
    roundRect(c, (i % 2) * 2 - 1, (THICK * i) / 4, BW, BH, 6);
    c.fillStyle = i % 2 ? "#e8f8dc" : COLOR.moneyGreenShadow;
    c.fill();
    c.strokeStyle = "#0b3d1e";
    c.lineWidth = 2.5;
    c.stroke();
  }
  roundRect(c, 0, 0, BW, BH, 6);
  c.fillStyle = COLOR.moneyGreen;
  c.fill();
  c.lineWidth = 3;
  c.stroke();
  roundRect(c, 6, 6, BW - 12, BH - 12, 4);
  c.strokeStyle = "#bbf7d0";
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = COLOR.moneyGreenShadow;
  c.beginPath();
  c.ellipse(BW * 0.27, BH / 2, 13, 15, 0, 0, Math.PI * 2);
  c.ellipse(BW * 0.73, BH / 2, 13, 15, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#bbf7d0";
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.arc(i % 2 ? BW - 13 : 13, i < 2 ? 13 : BH - 13, 4, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#f5e6b8";
  c.fillRect(BW / 2 - 12, -1, 24, BH + 2);
  c.strokeStyle = "#8a6a24";
  c.lineWidth = 2.5;
  c.strokeRect(BW / 2 - 12, -1, 24, BH + 2);
  c.fillStyle = "#ffffff";
  c.globalAlpha = 0.35;
  c.fillRect(8, 8, BW / 2 - 24, 5);
}

// the cleaver, its tip at the origin travelling +x, its edge on the cut line
// and its blade to the -y side, the handle trailing
const BLADE = new Path2D();
BLADE.moveTo(0, 0);
BLADE.quadraticCurveTo(-BLADE_L * 0.5, 7, -BLADE_L, 0);
BLADE.lineTo(-BLADE_L, -BLADE_D);
BLADE.lineTo(-14, -BLADE_D);
BLADE.quadraticCurveTo(4, -BLADE_D, 4, -BLADE_D + 16);
BLADE.closePath();
BLADE.moveTo(-26 + 7, -BLADE_D + 17);
BLADE.arc(-26, -BLADE_D + 17, 7, 0, Math.PI * 2);
const HANDLE = new Path2D();
HANDLE.rect(-BLADE_L - HANDLE_L, -BLADE_D * 0.5 - 9, HANDLE_L + 4, 18);
const EDGE = new Path2D();
EDGE.moveTo(0, 0);
EDGE.quadraticCurveTo(-BLADE_L * 0.5, 7, -BLADE_L, 0);

interface Toss {
  launchAt: number;
  upMs: number;
  x0: number;
  x: number;
  y: number;
  tilt: number;
  spin: number;
  cut: Slash;
  angle: number;
  seed: number;
  tx: Float32Array;
  ty: Float32Array;
}
interface State {
  tosses: Toss[];
  finLaunch: number;
  peakAt: number;
  cross: Slash[];
  burstAt: number;
  bx: Float32Array;
  by: Float32Array;
  br: Float32Array;
  fx: Float32Array;
  fy: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  swooshes: Float32Array;
  swooshed: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const QX = [1, -1, -1, 1];
const QY = [1, 1, -1, -1];
const mid: Point = { x: 0, y: 0 };
const apart: Point = { x: 0, y: 0 };
const stackAt: Point = { x: 0, y: 0 };

function drawBundle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
): void {
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(bundle, -SPR_W / 2, -SPR_H / 2, SPR_W, SPR_H);
  ctx.rotate(-rotation);
  ctx.translate(-x, -y);
}

// one half of a chopped bundle: clipped to the cut's `side` and turned
// `tumble` more
function drawHalf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  rotation: number,
  tumble: number,
  side: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle + tumble);
  ctx.beginPath();
  ctx.rect(-CLIP, side > 0 ? 0 : -CLIP, CLIP * 2, CLIP);
  ctx.clip();
  ctx.rotate(rotation - angle);
  ctx.drawImage(bundle, -SPR_W / 2, -SPR_H / 2, SPR_W, SPR_H);
  ctx.restore();
}

// the cleaver over its swipe: raised at the start, swung through, fading
function drawCleaver(
  ctx: CanvasRenderingContext2D,
  cut: Slash,
  angle: number,
  ms: number,
  scale: number,
): void {
  if (ms < cut.startMs - LEAD_MS || ms > cut.endMs + FADE_MS) return;
  const dx = cut.to.x - cut.from.x;
  const dy = cut.to.y - cut.from.y;
  const length = Math.hypot(dx, dy) || 1;
  let x: number;
  let y: number;
  let alpha: number;
  if (ms < cut.startMs) {
    const p = (ms - cut.startMs + LEAD_MS) / LEAD_MS;
    const back = WIND * (1 - p * p);
    x = cut.from.x - (dx / length) * back;
    y = cut.from.y - (dy / length) * back;
    alpha = p;
  } else {
    const u = clamp01((ms - cut.startMs) / (cut.endMs - cut.startMs));
    x = cut.from.x + dx * u;
    y = cut.from.y + dy * u;
    alpha = 1 - clamp01((ms - cut.endMs) / FADE_MS);
  }
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.globalAlpha = alpha * 0.45;
  ctx.strokeStyle = COLOR.moneyGreen;
  ctx.lineWidth = 18;
  ctx.stroke(BLADE);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#c9ffd8";
  ctx.fill(BLADE, "evenodd");
  ctx.fillStyle = COLOR.moneyGreen;
  ctx.fill(HANDLE);
  ctx.strokeStyle = COLOR.white;
  ctx.lineWidth = 5;
  ctx.stroke(EDGE);
  ctx.restore();
}

// a point on the arc from (fx, fy) up onto (tx, ty) at t, quickening
function arcX(fx: number, tx: number, t: number): number {
  const u = t * (0.55 + 0.45 * t);
  const v = 1 - u;
  return v * v * fx + u * v * (fx + tx) + u * u * tx;
}
function arcY(fy: number, ty: number, t: number): number {
  const u = t * (0.55 + 0.45 * t);
  const v = 1 - u;
  const cy = Math.min(fy, ty) - LIFT;
  return v * v * fy + 2 * u * v * cy + u * u * ty;
}

// a bill fluttering from (fx, fy) up into (tx, ty) `since` ms on
function drawBill(
  ctx: CanvasRenderingContext2D,
  frames: readonly HTMLCanvasElement[],
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  since: number,
  salt: number,
): void {
  if (since < 0 || since >= FLY_MS || frames.length === 0) return;
  const t = since / FLY_MS;
  const frame = frames[((since * BILL_FLIP + salt) | 0) % frames.length];
  const w = BILL_W * (1 - 0.35 * t);
  const h = (w * frame.height) / (frame.width || 1);
  ctx.globalAlpha = 1 - t * t * t;
  ctx.drawImage(
    frame,
    arcX(fx, tx, t) - w / 2,
    arcY(fy, ty, t) - h / 2,
    w,
    h,
  );
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
  const t = since / FLY_MS;
  if (t >= 1) {
    const landed = since - FLY_MS;
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
  stampGlimmer(
    ctx,
    arcX(fx, tx, t),
    arcY(fy, ty, t),
    SPECK * (1 - 0.4 * t),
    salt + since * 0.02,
    salt % 3 ? COLOR.heavenlyGold : COLOR.white,
  );
}

registerFloorCrit("cleaverCrit", {
  plan(r, _bars, hit) {
    const tosses: Toss[] = [];
    const swooshes: number[] = [];
    let t = FIRST_MS;
    let lastLaunch = 0;
    for (let i = 0; i < TOSSES; i++) {
      const p = i / (TOSSES - 1);
      const side = i % 2 ? 1 : -1;
      const launchAt = t;
      const upMs = lerp(UP_MS[0], UP_MS[1], p);
      const x = side * lerp(SIDE_X[0], SIDE_X[1], hash01(i, 7710));
      const y = lerp(PEAK_Y[0], PEAK_Y[1], hash01(i, 7711));
      const a =
        Math.PI / 2 - side * lerp(TILT[0], TILT[1], hash01(i, 7712));
      const dx = Math.cos(a) * REACH;
      const dy = Math.sin(a) * REACH;
      const swipe = lerp(SWIPE_MS[0], SWIPE_MS[1], p);
      const cut = planSlash(
        { x: x - dx, y: y - dy },
        { x: x + dx, y: y + dy },
        launchAt + upMs - swipe / 2,
        swipe,
      );
      const tx = new Float32Array(SPOTS);
      const ty = new Float32Array(SPOTS);
      for (let j = 0; j < SPOTS; j++) {
        const at = readoutSpot(ORIGIN, j + i * 20, 7720);
        tx[j] = at.x;
        ty[j] = at.y;
      }
      tosses.push({
        launchAt,
        upMs,
        x0: x * 0.75,
        x,
        y,
        tilt: (hash01(i, 7713) - 0.5) * 0.3,
        spin: side * SPIN,
        cut,
        angle: a,
        seed: hash01(i, 7714),
        tx,
        ty,
      });
      swooshes.push(cut.startMs);
      hit(0, cut.endMs, 0);
      lastLaunch = launchAt;
      t += lerp(TOSS_GAPS_MS[0], TOSS_GAPS_MS[1], p);
    }
    const finLaunch = lastLaunch + FIN_AFTER_MS;
    const peakAt = finLaunch + FIN_UP_MS;
    const cx = Math.cos(CROSS_ANGLE) * CROSS_REACH;
    const cy = Math.sin(CROSS_ANGLE) * CROSS_REACH;
    const first = planSlash(
      { x: -cx, y: FIN_Y - cy },
      { x: cx, y: FIN_Y + cy },
      peakAt + CHARGE_MS,
      CROSS_MS,
    );
    const second = planSlash(
      { x: -cy, y: FIN_Y + cx },
      { x: cy, y: FIN_Y - cx },
      first.endMs + CROSS_GAP_MS,
      CROSS_MS,
    );
    swooshes.push(first.startMs, second.startMs);
    hit(0, second.endMs, 1);
    const bx = new Float32Array(STACK);
    const by = new Float32Array(STACK);
    const br = new Float32Array(STACK);
    for (let k = 0; k < STACK; k++) {
      bx[k] = (hash01(k, 7730) - 0.5) * 24;
      by[k] = (k - (STACK - 1) / 2) * STACK_STEP;
      br[k] = (hash01(k, 7731) - 0.5) * 0.16;
    }
    const fx = new Float32Array(BURST_N);
    const fy = new Float32Array(BURST_N);
    const tx = new Float32Array(BURST_N);
    const ty = new Float32Array(BURST_N);
    for (let j = 0; j < BURST_N; j++) {
      const a = hash01(j, 7740) * Math.PI * 2;
      const d = 130 * Math.sqrt(hash01(j, 7741));
      fx[j] = Math.cos(a) * d;
      fy[j] = FIN_Y + Math.sin(a) * d;
      const at = readoutSpot(ORIGIN, j, 7742);
      tx[j] = at.x;
      ty[j] = at.y;
    }
    states.set(r, {
      tosses,
      finLaunch,
      peakAt,
      cross: [first, second],
      burstAt: second.endMs,
      bx,
      by,
      br,
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
    if (!to) return;
    drawNumberShrink(ctx, r, ms);
    ctx.save();
    ctx.translate(to.x, to.y);
    const { tosses, cross, burstAt, peakAt, bx, by, br } = s;
    const frames = billFrames();

    // the bundles: tossed up spinning, then chopped, the halves sliding apart
    for (let i = 0; i < tosses.length; i++) {
      const b = tosses[i];
      const up = (ms - b.launchAt) / b.upMs;
      if (up <= 0) continue;
      const since = ms - b.cut.endMs;
      if (since < 0) {
        const e = up >= 1 ? 1 : 1 - (1 - up) ** 2;
        ctx.globalAlpha = clamp01((ms - b.launchAt) / IN_MS);
        drawBundle(
          ctx,
          lerp(b.x0, b.x, e),
          lerp(START_Y, b.y, e),
          b.tilt + b.spin * (1 - e),
        );
        ctx.globalAlpha = 1;
        continue;
      }
      const h = since / HALF_MS;
      if (h >= 1) continue;
      const off = GAP * clamp01(since / APART_MS) + DRIFT * h;
      const drop = FALL * h * h;
      const alpha = 1 - h * h;
      const n = b.cut.n;
      drawHalf(
        ctx,
        b.x + n.x * off,
        b.y + n.y * off + drop,
        b.angle,
        b.tilt,
        TUMBLE * h,
        1,
        alpha,
      );
      drawHalf(
        ctx,
        b.x - n.x * off,
        b.y - n.y * off + drop,
        b.angle,
        b.tilt,
        -TUMBLE * h,
        -1,
        alpha,
      );
    }

    // the stack: tossed up as one, trembling, chopped in a cross, its
    // quarters flung apart in the burst
    const finUp = (ms - s.finLaunch) / FIN_UP_MS;
    const burst = (ms - burstAt) / BURST_MS;
    const charge = clamp01((ms - peakAt) / CHARGE_MS);
    if (finUp > 0 && burst < 1) {
      const first = cross[0];
      if (ms < first.endMs) {
        const e = finUp >= 1 ? 1 : 1 - (1 - finUp) ** 2;
        const amp = lerp(TREMBLE[0], TREMBLE[1], charge) * (finUp >= 1 ? 1 : 0);
        const ox = amp * Math.sin(ms * 0.11);
        const oy = lerp(START_Y, FIN_Y, e) + amp * Math.cos(ms * 0.137);
        ctx.globalAlpha = clamp01((ms - s.finLaunch) / IN_MS);
        for (let k = 0; k < STACK; k++)
          drawBundle(ctx, ox + bx[k], oy + by[k], br[k] + (1 - e) * 0.6);
        ctx.globalAlpha = 1;
      } else {
        const fling = burst > 0 ? FLING * burst * (0.6 + 0.4 * burst) : 0;
        const alpha = burst > 0 ? 1 - burst * burst : 1;
        const ca = Math.cos(CROSS_ANGLE);
        const sa = Math.sin(CROSS_ANGLE);
        for (let q = 0; q < 4; q++) {
          const lx = QX[q] * 60;
          const ly = QY[q] * 60;
          const ox = lx * ca - ly * sa;
          const oy = lx * sa + ly * ca;
          mid.x = ox;
          mid.y = FIN_Y + oy;
          sliceOffset(cross, mid, ms, FIN_GAP, apart);
          const l = Math.hypot(ox, oy) || 1;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(apart.x + (ox / l) * fling, FIN_Y + apart.y + (oy / l) * fling);
          ctx.rotate(
            CROSS_ANGLE + (burst > 0 ? QX[q] * QY[q] * FIN_TUMBLE * burst : 0),
          );
          ctx.beginPath();
          ctx.rect(
            QX[q] > 0 ? 0 : -QUARTER,
            QY[q] > 0 ? 0 : -QUARTER,
            QUARTER,
            QUARTER,
          );
          ctx.clip();
          ctx.rotate(-CROSS_ANGLE);
          for (let k = 0; k < STACK; k++) drawBundle(ctx, bx[k], by[k], br[k]);
          ctx.restore();
        }
      }
    }

    // the loose bills fluttering up into the total
    for (let i = 0; i < tosses.length; i++) {
      const b = tosses[i];
      const since = ms - b.cut.endMs;
      if (since < 0 || since > FLY_MS + BILL_N * STREAM_GAP_MS) continue;
      for (let j = 0; j < BILL_N; j++)
        drawBill(
          ctx,
          frames,
          b.x,
          b.y,
          b.tx[j],
          b.ty[j],
          since - j * STREAM_GAP_MS,
          j + i * 3,
        );
    }
    const burstSince = ms - burstAt;
    if (burstSince >= 0 && burstSince < FLY_MS + BURST_BILLS * BURST_GAP_MS)
      for (let j = 0; j < BURST_BILLS; j++)
        drawBill(
          ctx,
          frames,
          s.fx[j],
          s.fy[j],
          s.tx[j],
          s.ty[j],
          burstSince - j * BURST_GAP_MS,
          j,
        );
    ctx.globalAlpha = 1;

    // the cleaver and its cuts
    for (let i = 0; i < tosses.length; i++) {
      const b = tosses[i];
      drawSlash(ctx, b.cut, ms, CUT_W, now);
      drawCleaver(ctx, b.cut, b.angle, ms, CLEAVER);
    }
    for (let c = 0; c < cross.length; c++) {
      const cut = cross[c];
      drawSlash(ctx, cut, ms, CROSS_W, now);
      drawCleaver(
        ctx,
        cut,
        Math.atan2(cut.to.y - cut.from.y, cut.to.x - cut.from.x),
        ms,
        BIG_CLEAVER,
      );
    }
    for (let i = 0; i < tosses.length; i++)
      drawSliceSpill(ctx, tosses[i].cut, ms, SPILL, SPILL_N);
    drawSliceSpill(ctx, cross[0], ms, FIN_SPILL, FIN_SPILL_N);
    drawSliceSpill(ctx, cross[1], ms, FIN_SPILL, FIN_SPILL_N);

    // chop flashes, the stack's glow and pull, the glitter showering up
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (charge > 0 && burstSince < 0) {
      stampGlimmer(
        ctx,
        0,
        FIN_Y,
        lerp(GLOW[0], GLOW[1], charge),
        ms * 0.004,
        COLOR.heavenlyGold,
      );
      if (ms < cross[0].startMs)
        for (let j = 0; j < PULL_N; j++) {
          const p = ((ms - peakAt) * PULL_RATE + hash01(j, 7750)) % 1;
          const a = hash01(j, 7751) * Math.PI * 2 + p * 1.5;
          const d = PULL * (1 - p) ** 1.5;
          stampGlimmer(
            ctx,
            Math.cos(a) * d,
            FIN_Y + Math.sin(a) * d,
            PULL_SPECK * (1 - 0.5 * p),
            j,
            j % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
    }
    if (burst >= 0 && burst < 1)
      stampGlimmer(ctx, 0, FIN_Y, BURST_FLASH * (1 - burst), 0, COLOR.white);
    for (let i = 0; i < tosses.length; i++) {
      const b = tosses[i];
      const since = ms - b.cut.endMs;
      if (since < 0) continue;
      if (since < FLASH_MS)
        stampGlimmer(
          ctx,
          b.x,
          b.y,
          FLASH * (1 - since / FLASH_MS),
          b.seed,
          COLOR.white,
        );
      if (since > FLY_MS + LAND_MS + SPOTS * STREAM_GAP_MS) continue;
      for (let j = BILL_N; j < SPOTS; j++)
        drawSpeck(
          ctx,
          b.x,
          b.y,
          b.tx[j],
          b.ty[j],
          since - (j - BILL_N) * STREAM_GAP_MS,
          j + i * 20,
        );
    }
    if (burstSince >= 0 && burstSince < FLY_MS + LAND_MS + BURST_N * BURST_GAP_MS)
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

    // the big blast: on the total, and where the stack burst
    if (burstSince >= 0) {
      drawDetonation(ctx, to, burstSince, FINALE_BLAST, now);
      stackAt.x = to.x;
      stackAt.y = to.y + FIN_Y;
      drawDetonation(ctx, stackAt, burstSince, STACK_BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
