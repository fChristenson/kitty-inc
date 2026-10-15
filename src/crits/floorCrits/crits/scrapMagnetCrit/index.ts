// Scrap Magnet, a floor crit: the number bursts into hundreds of bits of
// gold scrap (nuts, bolts, coins, cogs) littering every bar in view; a big
// glowing horseshoe magnet swings down the bars one by one, each bar's scrap
// trembling as it nears, then leaping up and snapping onto it in a clump
// with a clank, flash and jolt as that bar levels, quicker each bar, the
// clump growing; over its own bar last it charges, cuts out, and the whole
// heap crashes down onto it in the big blast
import { COLOR } from "../../../../palette";
import { flingOut } from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { easeOut } from "../../../../shared/easing";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { playCoinDrop, playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 110;
// the scrap: up to BITS_MAX in all (BITS_BAR a bar), over SPREAD of the
// bar's half width, JITTER px off its middle, blown out over FLING_MS
const BITS_MAX = 360;
const BITS_BAR = 72;
const SPREAD = 0.92;
const JITTER = 22;
const FLING_MS = 200;
const BIT_SIZE: [number, number] = [15, 25];
// trembling for TREMBLE_LEAD ms before the magnet reaches its bar
const TREMBLE_LEAD = 240;
const TREMBLE = 6;
// the magnet: MAG_W x MAG_H, hovering HOVER px over a bar, its poles POLE px
// under its middle, dropping in from ENTER px up, swung SWING_SAG px low
// between bars
const MAG_W = 140;
const MAG_H = 130;
const HOVER = 175;
const POLE = 60;
const ENTER = 520;
const SWING_SAG = 60;
const JOLT = 16;
const JOLT_MS = 90;
// a bar's scrap leaping over LEAP_MS, the magnet swinging on over SWING_MS
// (both quickening bar by bar)
const LEAP_MS: [number, number] = [210, 110];
const SWING_MS: [number, number] = [140, 80];
// the clump: its n-th bit CLUMP_K * sqrt(n) px off the poles
const CLUMP_K = 4.6;
// the climax: charging CHARGE_MS, cut out, the heap falling DROP_MS, its
// bits flung SCATTER px/ms for SCATTER_MS off the blast
const CHARGE_MS = 240;
const CHARGE_TREMBLE = 7;
const DROP_MS = 110;
const SCATTER_MS = 200;
const SCATTER = 1.4;
const FLASH_MS = 140;
const BLAST = 220;
const OWN_BLAST = 420;
// shakes by step: a bar's clank, the crash
const SHAKES = [1.2, 3.2];

const GOLD = fadeStops(COLOR.heavenlyGold);
const CORE = fadeStops(COLOR.white, 0.3);

// the scrap sprites: SCRAP_KINDS looks x SCRAP_TURNS turns, SCRAP_PX square
const SCRAP_KINDS = 4;
const SCRAP_TURNS = 4;
const SCRAP_PX = 32;
let scrap: HTMLCanvasElement[] | null = null;
let magnet: HTMLCanvasElement | null = null;

function hexagon(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}

function bakeScrap(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  const m = SCRAP_PX / 2;
  for (let kind = 0; kind < SCRAP_KINDS; kind++)
    for (let turn = 0; turn < SCRAP_TURNS; turn++) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = SCRAP_PX;
      const c = cv.getContext("2d")!;
      c.translate(m, m);
      c.rotate((turn * Math.PI) / SCRAP_TURNS + kind);
      c.lineWidth = 2.5;
      c.lineJoin = "round";
      c.strokeStyle = COLOR.coinOutline;
      c.fillStyle = COLOR.coinSpriteGold;
      if (kind === 0) {
        // coin
        c.beginPath();
        c.arc(0, 0, 12, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.strokeStyle = COLOR.coinHighlight;
        c.beginPath();
        c.arc(0, 0, 7.5, 0, Math.PI * 2);
        c.stroke();
      } else if (kind === 1) {
        // nut
        hexagon(c, 0, 0, 12);
        c.fill();
        c.stroke();
        c.fillStyle = COLOR.coinOutline;
        c.beginPath();
        c.arc(0, 0, 4.5, 0, Math.PI * 2);
        c.fill();
      } else if (kind === 2) {
        // bolt
        c.fillRect(-3.5, -4, 7, 17);
        c.strokeRect(-3.5, -4, 7, 17);
        c.beginPath();
        for (let y = 0; y < 12; y += 4) {
          c.moveTo(-3.5, y);
          c.lineTo(3.5, y + 2);
        }
        c.stroke();
        hexagon(c, 0, -7, 7);
        c.fill();
        c.stroke();
      } else {
        // cog
        for (let k = 0; k < 8; k++) {
          c.save();
          c.rotate((k * Math.PI) / 4);
          c.fillRect(-2.6, -13, 5.2, 6);
          c.strokeRect(-2.6, -13, 5.2, 6);
          c.restore();
        }
        c.beginPath();
        c.arc(0, 0, 9, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = COLOR.coinOutline;
        c.beginPath();
        c.arc(0, 0, 3.5, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = COLOR.coinSpriteHighlight;
      c.beginPath();
      c.arc(-3.5, -3.5, 2.2, 0, Math.PI * 2);
      c.fill();
      out.push(cv);
    }
  return out;
}

// the horseshoe, poles down: red, outlined black, silver tips
function bakeMagnet(): HTMLCanvasElement {
  const w = 168;
  const h = 156;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  const cx = w / 2;
  const r = 50;
  const t = 40;
  const cy = r + t / 2 + 6;
  const tip = 30;
  const leg = () => {
    c.beginPath();
    c.moveTo(cx - r, h - 6);
    c.lineTo(cx - r, cy);
    c.arc(cx, cy, r, Math.PI, 0);
    c.lineTo(cx + r, h - 6);
  };
  c.lineCap = "butt";
  leg();
  c.strokeStyle = COLOR.black;
  c.lineWidth = t + 8;
  c.stroke();
  leg();
  c.strokeStyle = COLOR.red;
  c.lineWidth = t;
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, r + t * 0.22, Math.PI * 1.15, Math.PI * 1.6);
  c.strokeStyle = COLOR.white;
  c.globalAlpha = 0.55;
  c.lineWidth = 6;
  c.lineCap = "round";
  c.stroke();
  c.globalAlpha = 1;
  c.fillStyle = COLOR.silverTicketGray;
  c.strokeStyle = COLOR.black;
  c.lineWidth = 4;
  for (const x of [cx - r, cx + r]) {
    c.fillRect(x - t / 2, h - 6 - tip, t, tip);
    c.strokeRect(x - t / 2, h - 6 - tip, t, tip);
  }
  return cv;
}

interface State {
  // the passes in play order, its own bar last: bar, hover spot, when the
  // magnet gets there and when its scrap snaps on
  bar: Uint8Array;
  hx: Float32Array;
  hy: Float32Array;
  arrive: Float32Array;
  hitAt: Float32Array;
  // bits caught by the end of each pass
  caught: Uint16Array;
  cut: number;
  crash: number;
  cutPole: Point;
  // each bit: its pass, where it lies, its lift, look, size, clump slot,
  // leap and scatter
  passOf: Uint8Array;
  sx: Float32Array;
  sy: Float32Array;
  lift: Float32Array;
  look: Uint8Array;
  size: Float32Array;
  cx: Float32Array;
  cy: Float32Array;
  leap0: Float32Array;
  leap1: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
}
const states = new WeakMap<Running, State>();
const mag: Point = { x: 0, y: 0 };
const was: Point = { x: 0, y: 0 };
const origin: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };

// the magnet's middle at ms (false before it drops in)
function magAt(s: State, ms: number, into: Point): boolean {
  const n = s.arrive.length;
  if (ms < IN_MS) return false;
  if (ms < s.arrive[0]) {
    const u = (ms - IN_MS) / (s.arrive[0] - IN_MS);
    into.x = s.hx[0];
    into.y = s.hy[0] - ENTER * (1 - u);
    return true;
  }
  let k = 0;
  while (k < n - 1 && ms >= s.arrive[k + 1]) k++;
  if (k < n - 1 && ms > s.hitAt[k]) {
    // swinging low on to the next bar
    const u = easeOut((ms - s.hitAt[k]) / (s.arrive[k + 1] - s.hitAt[k]));
    const ax = s.hx[k];
    const ay = s.hy[k];
    const bx = s.hx[k + 1];
    const by = s.hy[k + 1];
    const qx = (ax + bx) / 2;
    const qy = Math.max(ay, by) + SWING_SAG;
    into.x = (1 - u) ** 2 * ax + 2 * (1 - u) * u * qx + u * u * bx;
    into.y = (1 - u) ** 2 * ay + 2 * (1 - u) * u * qy + u * u * by;
    return true;
  }
  into.x = s.hx[k];
  into.y = s.hy[k];
  const since = ms - s.hitAt[k];
  if (since >= 0 && since < JOLT_MS) into.y += JOLT * (1 - since / JOLT_MS);
  if (k === n - 1 && ms > s.cut)
    into.y -= 70 * easeOut(clamp01((ms - s.cut) / 200));
  return true;
}

registerFloorCrit("scrapMagnetCrit", {
  plan(r, bars, hit) {
    scrap ??= bakeScrap();
    magnet ??= bakeMagnet();
    const base = bars[0];
    const half = r.play.barHalfWidth;
    const order = ownLast(bars);
    const n = order.length;
    const perBar = Math.min(BITS_BAR, Math.floor(BITS_MAX / n));
    const count = perBar * n;
    const s: State = {
      bar: Uint8Array.from(order),
      hx: new Float32Array(n),
      hy: new Float32Array(n),
      arrive: new Float32Array(n),
      hitAt: new Float32Array(n),
      caught: new Uint16Array(n),
      cut: 0,
      crash: 0,
      cutPole: { x: 0, y: 0 },
      passOf: new Uint8Array(count),
      sx: new Float32Array(count),
      sy: new Float32Array(count),
      lift: new Float32Array(count),
      look: new Uint8Array(count),
      size: new Float32Array(count),
      cx: new Float32Array(count),
      cy: new Float32Array(count),
      leap0: new Float32Array(count),
      leap1: new Float32Array(count),
      vx: new Float32Array(count),
      vy: new Float32Array(count),
    };
    let t = IN_MS + FLING_MS;
    for (let k = 0; k < n; k++) {
      const q = k / Math.max(1, n - 1);
      const own = k === n - 1;
      s.hx[k] = own ? 0 : (k % 2 ? 1 : -1) * half * 0.3;
      s.hy[k] = bars[order[k]].y - base.y - HOVER;
      s.arrive[k] = t;
      t += lerp(LEAP_MS[0], LEAP_MS[1], q);
      s.hitAt[k] = t;
      s.caught[k] = (k + 1) * perBar;
      if (!own) {
        hit(order[k], t, 0);
        t += lerp(SWING_MS[0], SWING_MS[1], q);
      }
    }
    s.cut = t + CHARGE_MS;
    s.crash = s.cut + DROP_MS;
    hit(0, s.crash, 1);
    s.cutPole.x = s.hx[n - 1];
    s.cutPole.y = s.hy[n - 1] + POLE;
    for (let i = 0; i < count; i++) {
      const k = Math.floor(i / perBar);
      const leap = s.hitAt[k] - s.arrive[k];
      const h = holeHash(i, 5210);
      s.passOf[i] = k;
      s.sx[i] = (holeHash(i, 5211) * 2 - 1) * half * SPREAD;
      s.sy[i] =
        bars[order[k]].y - base.y + (holeHash(i, 5212) * 2 - 1) * JITTER;
      s.lift[i] = holeHash(i, 5213);
      s.look[i] = Math.floor(holeHash(i, 5214) * SCRAP_KINDS) * SCRAP_TURNS;
      s.size[i] = lerp(BIT_SIZE[0], BIT_SIZE[1], holeHash(i, 5215));
      const a = i * 2.39996;
      const rr = CLUMP_K * Math.sqrt(i + 1);
      s.cx[i] = Math.cos(a) * rr * 1.1;
      s.cy[i] = Math.sin(a) * rr * 0.75 + rr * 0.55;
      s.leap0[i] = s.arrive[k] + h * leap * 0.4;
      s.leap1[i] = s.leap0[i] + leap * 0.6;
      const d = Math.max(1, Math.hypot(s.cx[i], s.cy[i]));
      s.vx[i] = (s.cx[i] / d) * SCATTER;
      s.vy[i] = -SCATTER * (0.4 + 0.6 * holeHash(i, 5216));
    }
    states.set(r, s);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || !scrap || !magnet) return;
    const now = r.startedAt + ms;
    const base = bars[0];
    const n = s.arrive.length;
    const last = n - 1;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    if (r.kicked === 0 && ms >= IN_MS) {
      playSwoosh();
      r.kicked = 1;
    }
    // a clank as each bar's scrap snaps on
    while (r.kicked <= n && ms >= s.hitAt[r.kicked - 1]) {
      playCoinDrop();
      r.kicked++;
    }
    ctx.save();
    ctx.translate(base.x, base.y);
    origin.x = -base.x;
    origin.y = -base.y;
    const shown = magAt(s, ms, mag) && ms < s.cut + 200;
    const poleX = mag.x;
    const poleY = mag.y + POLE;
    // passes done, and how many bits hang in the clump
    let done = 0;
    while (done < n && ms >= s.hitAt[done]) done++;
    const held = done > 0 ? s.caught[done - 1] : 0;
    const clumpR = CLUMP_K * Math.sqrt(held + 1);
    const charge =
      ms > s.hitAt[last] ? clamp01((ms - s.hitAt[last]) / CHARGE_MS) : 0;
    const cutOut = ms >= s.cut;

    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (shown && !cutOut) {
      const heat = Math.min(1, done / n);
      const throb = 1 + 0.12 * Math.sin(now * (0.02 + 0.04 * charge));
      ctx.globalAlpha = 0.55 + 0.45 * Math.max(heat, charge);
      drawGlow(ctx, GOLD, mag.x, mag.y, MAG_W * (0.85 + 0.5 * charge) * throb);
      // the pull: a column of light down onto the bar its scrap leaps from
      for (let k = 0; k < n; k++) {
        if (ms < s.arrive[k] || ms >= s.hitAt[k]) continue;
        const barY = s.hy[k] + HOVER;
        const u = (ms - s.arrive[k]) / (s.hitAt[k] - s.arrive[k]);
        const tall = Math.max(1, (barY - poleY) / 2 + 30);
        ctx.globalAlpha = 0.5 + 0.5 * u;
        drawGlow(ctx, GOLD, poleX, (poleY + barY) / 2, 70, tall / 70);
      }
      if (held > 0) {
        ctx.globalAlpha = 0.7;
        drawGlow(ctx, GOLD, poleX, poleY + clumpR * 0.6, clumpR * 1.7 + 30);
      }
    }
    ctx.globalAlpha = 1;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    if (shown) {
      was.x = mag.x;
      was.y = mag.y;
      magAt(s, ms - 20, was);
      const tilt = Math.max(-0.5, Math.min(0.5, (mag.x - was.x) * 0.02));
      const shiver = charge * (cutOut ? 0 : 3);
      ctx.save();
      ctx.translate(
        mag.x + Math.sin(now * 0.11) * shiver,
        mag.y + Math.cos(now * 0.13) * shiver,
      );
      ctx.rotate(tilt);
      if (cutOut) ctx.globalAlpha = 1 - clamp01((ms - s.cut) / 200);
      ctx.drawImage(magnet, -MAG_W / 2, -MAG_H / 2, MAG_W, MAG_H);
      ctx.restore();
    }

    // the scrap
    const flinging = ms < IN_MS + FLING_MS;
    const spin = Math.floor(ms / 50);
    const scatterU = ms >= s.crash ? (ms - s.crash) / SCATTER_MS : 0;
    if (ms >= IN_MS && scatterU < 1) {
      if (scatterU > 0) ctx.globalAlpha = 1 - scatterU;
      const flingU = (ms - IN_MS) / FLING_MS;
      const dropU = cutOut ? clamp01((ms - s.cut) / DROP_MS) ** 2 : 0;
      const shake = charge * CHARGE_TREMBLE;
      for (let i = 0; i < s.passOf.length; i++) {
        const k = s.passOf[i];
        let turn = s.look[i] & (SCRAP_TURNS - 1);
        if (flinging) {
          spot.x = s.sx[i];
          spot.y = s.sy[i];
          flingOut(origin, spot, s.lift[i], flingU, bit);
          turn = (turn + spin) & (SCRAP_TURNS - 1);
        } else if (ms < s.leap0[i]) {
          const near = clamp01(1 - (s.arrive[k] - ms) / TREMBLE_LEAD);
          const amp = near * TREMBLE;
          bit.x = s.sx[i] + Math.sin(now * 0.09 + i * 1.7) * amp;
          bit.y = s.sy[i] - near * 5 + Math.cos(now * 0.11 + i) * amp * 0.6;
        } else if (ms < s.leap1[i]) {
          const u = ((ms - s.leap0[i]) / (s.leap1[i] - s.leap0[i])) ** 2;
          bit.x = lerp(s.sx[i], poleX + s.cx[i], u);
          bit.y = lerp(s.sy[i], poleY + s.cy[i], u);
          turn = (turn + spin) & (SCRAP_TURNS - 1);
        } else if (!cutOut) {
          bit.x = poleX + s.cx[i] + Math.sin(now * 0.12 + i * 2.3) * shake;
          bit.y = poleY + s.cy[i] + Math.cos(now * 0.1 + i) * shake;
        } else {
          const fx = s.cutPole.x + s.cx[i];
          const fy = s.cutPole.y + s.cy[i];
          const lx = s.cutPole.x + s.cx[i] * 1.5;
          const ly = -6 - s.cy[i] * 0.2;
          bit.x = lerp(fx, lx, dropU);
          bit.y = lerp(fy, ly, dropU);
          if (scatterU > 0) {
            const e = ms - s.crash;
            bit.x += s.vx[i] * e;
            bit.y += s.vy[i] * e + 0.004 * e * e;
            turn = (turn + spin) & (SCRAP_TURNS - 1);
          }
        }
        const z = s.size[i];
        ctx.drawImage(
          scrap[(s.look[i] & ~(SCRAP_TURNS - 1)) + turn],
          bit.x - z / 2,
          bit.y - z / 2,
          z,
          z,
        );
      }
      ctx.globalAlpha = 1;
    }

    // a white flash on every clank
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < n; k++) {
      const since = ms - s.hitAt[k];
      if (since < 0 || since >= FLASH_MS) continue;
      const f = 1 - since / FLASH_MS;
      const reach = CLUMP_K * Math.sqrt(s.caught[k] + 1);
      ctx.globalAlpha = f;
      drawGlow(
        ctx,
        CORE,
        poleX,
        poleY + reach * 0.5,
        (reach * 1.4 + 50) * (1.4 - 0.4 * f),
      );
    }
    ctx.globalAlpha = 1;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    drawDetonation(ctx, origin, ms - IN_MS, BLAST, now);
    spot.x = s.cutPole.x;
    spot.y = 0;
    drawDetonation(ctx, spot, ms - s.crash, OWN_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
