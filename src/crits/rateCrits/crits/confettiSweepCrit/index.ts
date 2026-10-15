// Confetti Sweep, a rate crit: the number pops like a party popper, flinging
// hundreds of bits of gold and coloured confetti fluttering over every bar in
// view; then a glowing sweep drives along each bar in brisk strokes, one bar
// after another and quicker each, herding the mess into a pile on the readout
// that pops (the reward); last, its own's confetti swirls round into one big
// trembling pile on its readout, faster and faster, and bursts in a blast.
// Every bar it piled on runs faster for every pile swept in the run, each
// new pile flipping the readouts of the ones before
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { flipIncomeRate } from "../../../../floors/incomePanel";
import { BLOW_UP, flingOut } from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { easeOut } from "../../../../shared/easing";
import { playSpinTick } from "../../../../sound";
import { COLOR } from "../../../../palette";
import type { Floor } from "../../../../gameState";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import {
  BAR_HALF_H,
  holeHash,
  ownLast,
} from "../../../floorCrits/critPlayer/shared";

// the number swelling and popping, the confetti flung out over FLING_MS
const BLOW_MS = 110;
const FLING_MS = 240;
// about BITS bits in all, PER_BAR on a bar, OWN_MORE times as many on its own
const BITS = 240;
const PER_BAR: [number, number] = [22, 56];
const OWN_MORE = 2;
// a bit: PW by PH, flipping over as it flutters FLUTTER px about its spot
const PW = 10;
const PH = 6;
const SPRITE_SCALE = 2;
const FLUTTER = 6;
const FLUTTER_RATE = 0.012;
const FLIP_RATE = 0.03;
// gold weighted in among the colours
const COLORS = [
  COLOR.coinGold,
  COLOR.heavenlyGold,
  COLOR.coinGold,
  COLOR.red,
  COLOR.blue,
  COLOR.coinGold,
  COLOR.purple,
  COLOR.teal,
  COLOR.orange,
  COLOR.cyan,
];
// strewn from LEFT to RIGHT of the bar's half width, SPREAD_Y above and below
const LEFT = 0.92;
const RIGHT = 0.9;
const SPREAD_Y = BAR_HALF_H * 1.2;
// the readout READOUT of a bar's half width out, CONTACT_Y off its middle;
// the pile on it HEAP_W by HEAP_H (OWN_HEAP times on its own)
const READOUT = 0.6;
const CONTACT_Y = -20;
const HEAP_W = 46;
const HEAP_H = 30;
const OWN_HEAP = 1.7;
const PILE_Y = CONTACT_Y + HEAP_H * 0.45;
// the strokes: each from FRONT_FROM of the bar's half width to FRONT_STOP
// short of the readout over STROKE_MS, the next starting GAP_MS later, both
// QUICK times as long each one on (down to their mins); the bits it reaches
// riding DEPTH px ahead of it, closing on the readout's row over RIDE_MS
const STROKE_AT = 380;
const FRONT_FROM = 1.05;
const FRONT_STOP = 30;
const STROKE_MS = 230;
const STROKE_MIN = 120;
const GAP_MS = 170;
const GAP_MIN = 65;
const QUICK = 0.84;
const DEPTH: [number, number] = [4, 32];
const RIDE_MS = 110;
const RIDE_SPREAD = 12;
const STROKE_TICK = 0.9;
const FRONT_FADE = 70;
// the stroke's glow: GLOW_W by GLOW_H, its arc's front ARC_AT across
const GLOW_W = 70;
const GLOW_H = 150;
const ARC_AT = 0.72;
// a bar's bits heaped onto its readout over GATHER_MS, then popping out POP
// times their heap spot (OWN_POP on its own) and up POP_UP over POP_MS
const GATHER_MS = 70;
const POP_MS = 170;
const OWN_POP_MS = 260;
const POP = 3.5;
const OWN_POP = 6;
const POP_UP = 40;
const BLAST = 140;
const LAND_FLASH_MS = 160;
// its own: OWN_AFTER after the last stroke starts, its bits swirl SWIRL_TURNS
// round into its pile over SWIRL_MS, the pile trembling up to TREMBLE px and
// rumbling over the last TREMBLE_SHARE, glowing up to GLOW px
const OWN_AFTER = 80;
const SWIRL_MS = 470;
const SWIRL_TURNS = 1.5;
const TREMBLE = 6;
const TREMBLE_MS = 16;
const TREMBLE_SHARE = 0.5;
const RUMBLES = 5;
const RUMBLE_SHAKE: [number, number] = [0.3, 1];
const PILE_GLOW: [number, number] = [20, 130];
const OWN_BLAST = 340;
// shakes by step: -, a readout, its own
const SHAKES = [0.5, 1.2, 3];

interface State {
  count: number;
  bars: number;
  readX: number;
  x0: number;
  x1: number;
  // each bit's bar, colour, where it lies strewn, how far ahead of the front
  // it rides and on what row, its heap spot, how high it's flung and how far
  // it pops, its flutter's phase, when the front reaches it
  barOf: Int16Array;
  colOf: Uint8Array;
  sx: Float32Array;
  sy: Float32Array;
  depth: Float32Array;
  rideY: Float32Array;
  hx: Float32Array;
  hy: Float32Array;
  lift: Float32Array;
  phase: Float32Array;
  catchAt: Float32Array;
  // its own's bits: their angle and distance round its pile, the turn to
  // their heap spot and their distance there
  a0: Float32Array;
  r0: Float32Array;
  turn: Float32Array;
  hr: Float32Array;
  // each bar's stroke and landing
  strokeAt: Float32Array;
  strokeEnd: Float32Array;
  landAt: Float32Array;
  swirlAt: number;
  // shakes and ticks kicked by the crit itself, in time order
  kickAt: Float32Array;
  kickShake: Float32Array;
  kickTick: Float32Array;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// every colour's bit, a row each, drawn once
const CELL_W = PW + 2;
const CELL_H = PH + 2;
let atlas: HTMLCanvasElement | null = null;
function confettiAtlas(): HTMLCanvasElement {
  if (atlas) return atlas;
  const canvas = document.createElement("canvas");
  canvas.width = CELL_W * SPRITE_SCALE;
  canvas.height = CELL_H * COLORS.length * SPRITE_SCALE;
  const g = canvas.getContext("2d")!;
  g.scale(SPRITE_SCALE, SPRITE_SCALE);
  for (let c = 0; c < COLORS.length; c++) {
    const y = c * CELL_H + 1;
    g.fillStyle = COLORS[c];
    g.fillRect(1, y, PW, PH);
    g.fillStyle = COLOR.white;
    g.globalAlpha = 0.55;
    g.fillRect(1, y, PW, 1.5);
    g.globalAlpha = 1;
  }
  atlas = canvas;
  return canvas;
}

// the sweeping front: a glowing arc bowed the way it pushes, a soft swath
// trailing behind it, drawn once
let glow: HTMLCanvasElement | null = null;
function frontGlow(): HTMLCanvasElement {
  if (glow) return glow;
  const canvas = document.createElement("canvas");
  canvas.width = GLOW_W * SPRITE_SCALE;
  canvas.height = GLOW_H * SPRITE_SCALE;
  const g = canvas.getContext("2d")!;
  g.scale(SPRITE_SCALE, SPRITE_SCALE);
  const front = GLOW_W * ARC_AT;
  const swath = g.createLinearGradient(0, 0, front, 0);
  swath.addColorStop(0, "rgba(255,215,90,0)");
  swath.addColorStop(1, "rgba(255,215,90,0.35)");
  const radius = GLOW_H * 0.75;
  const cx = front - radius;
  const span = Math.asin(GLOW_H / 2 / radius) * 0.92;
  g.fillStyle = swath;
  g.beginPath();
  g.arc(cx, GLOW_H / 2, radius, -span, span);
  g.lineTo(0, GLOW_H / 2 + radius * Math.sin(span));
  g.lineTo(0, GLOW_H / 2 - radius * Math.sin(span));
  g.closePath();
  g.fill();
  g.lineCap = "round";
  const widths = [18, 10, 4];
  const alphas = [0.25, 0.5, 1];
  const colors = [COLOR.heavenlyGold, COLOR.coinGold, COLOR.white];
  for (let k = 0; k < widths.length; k++) {
    g.globalAlpha = alphas[k];
    g.strokeStyle = colors[k];
    g.lineWidth = widths[k];
    g.beginPath();
    g.arc(cx, GLOW_H / 2, radius, -span, span);
    g.stroke();
  }
  glow = canvas;
  return canvas;
}

// a sweep's piled bars: how many piles, its own's counting more
interface Run {
  piles: number;
  at: number;
  closed: boolean;
  floors: Floor[];
}
const RUN_MS = 6000;
const runs = new WeakMap<Floor, Run>();
interface Piled {
  run: Run;
  until: number;
}
const speedOf = (v: Piled): number =>
  Math.min(meta.values.max, 1 + meta.values.perPile * v.run.piles);
const piled = defineBarEffect<Piled>({
  speed: (v) => speedOf(v),
  ended: (v, now) => now >= v.until,
});

const clampRound = (v: number, range: [number, number]) =>
  Math.max(range[0], Math.min(range[1], Math.round(v)));

registerFloorCrit("confettiSweepCrit", {
  reward(t) {
    const { ownPiles, ms, ownMs } = meta.values;
    let run = runs.get(t.ownFloor);
    if (!run || run.closed || t.now - run.at > RUN_MS) {
      run = { piles: 0, at: t.now, closed: false, floors: [] };
      runs.set(t.ownFloor, run);
    }
    // the bars piled before speed up with this pile too
    for (const floor of run.floors)
      if (floor !== t.floor && piled.get(floor)?.run === run)
        flipIncomeRate(floor);
    t.flipRate();
    run.piles += t.own ? ownPiles : 1;
    if (!run.floors.includes(t.floor)) run.floors.push(t.floor);
    if (t.own) run.closed = true;
    const v: Piled = { run, until: t.now + (t.own ? ownMs : ms) };
    piled.set(t.floor, v);
    t.punch(`x${Math.round(speedOf(v) * 10) / 10} Speed`);
  },
  plan(r, bars, hit) {
    confettiAtlas();
    frontGlow();
    const half = r.play.barHalfWidth;
    const n = bars.length;
    const readX = half * READOUT;
    const x0 = -half * FRONT_FROM;
    const x1 = readX - FRONT_STOP;
    const per = Math.max(
      PER_BAR[0],
      Math.min(PER_BAR[1], BITS / (n - 1 + OWN_MORE)),
    );
    // the strokes, bar after bar, then its own's swirl
    const strokeAt = new Float32Array(n);
    const strokeEnd = new Float32Array(n);
    const landAt = new Float32Array(n);
    const kicks: { at: number; shake: number; tick: number }[] = [
      { at: BLOW_MS, shake: BLOW_UP.shake, tick: 0 },
    ];
    let start = STROKE_AT;
    let last = -1;
    let k = 0;
    for (const b of ownLast(bars)) {
      if (b === 0) continue;
      const dur = Math.max(STROKE_MIN, STROKE_MS * QUICK ** k);
      strokeAt[b] = start;
      strokeEnd[b] = start + dur;
      landAt[b] = start + dur + GATHER_MS;
      hit(b, landAt[b], 1);
      kicks.push({ at: start, shake: 0, tick: STROKE_TICK + 0.12 * k });
      last = start;
      start += Math.max(GAP_MIN, GAP_MS * QUICK ** k);
      k++;
    }
    const swirlAt = last < 0 ? STROKE_AT : last + OWN_AFTER;
    landAt[0] = swirlAt + SWIRL_MS;
    hit(0, landAt[0], 2);
    const rumbleFrom = landAt[0] - SWIRL_MS * TREMBLE_SHARE;
    for (let j = 0; j < RUMBLES; j++)
      kicks.push({
        at: rumbleFrom + SWIRL_MS * TREMBLE_SHARE * (j / RUMBLES) ** 0.6,
        shake: lerp(RUMBLE_SHAKE[0], RUMBLE_SHAKE[1], j / (RUMBLES - 1)),
        tick: 0,
      });
    kicks.sort((a, b) => a.at - b.at);
    let count = 0;
    const counts = new Int16Array(n);
    for (let b = 0; b < n; b++) {
      counts[b] =
        b === 0 ? Math.round(per * OWN_MORE) : clampRound(per, PER_BAR);
      count += counts[b];
    }
    const barOf = new Int16Array(count);
    const colOf = new Uint8Array(count);
    const sx = new Float32Array(count);
    const sy = new Float32Array(count);
    const depth = new Float32Array(count);
    const rideY = new Float32Array(count);
    const hx = new Float32Array(count);
    const hy = new Float32Array(count);
    const lift = new Float32Array(count);
    const phase = new Float32Array(count);
    const catchAt = new Float32Array(count);
    const a0 = new Float32Array(count);
    const r0 = new Float32Array(count);
    const turn = new Float32Array(count);
    const hr = new Float32Array(count);
    let i = 0;
    for (let b = 0; b < n; b++) {
      const own = b === 0;
      const scale = own ? OWN_HEAP : 1;
      for (let j = 0; j < counts[b]; j++, i++) {
        barOf[i] = b;
        colOf[i] = i % COLORS.length;
        sx[i] = lerp(-half * LEFT, half * RIGHT, Math.random());
        sy[i] = (Math.random() * 2 - 1) * SPREAD_Y;
        depth[i] = lerp(DEPTH[0], DEPTH[1], Math.random());
        rideY[i] = CONTACT_Y + (Math.random() * 2 - 1) * RIDE_SPREAD;
        const u = Math.random() * 2 - 1;
        hx[i] = (u * HEAP_W * scale) / 2;
        hy[i] = -Math.random() * HEAP_H * scale * (1 - u * u);
        lift[i] = holeHash(i, 7311);
        phase[i] = Math.random() * Math.PI * 2;
        if (own) {
          a0[i] = Math.atan2(sy[i] - PILE_Y, sx[i] - readX);
          r0[i] = Math.hypot(sx[i] - readX, sy[i] - PILE_Y);
          const ha = Math.atan2(hy[i], hx[i]);
          let d = ha - a0[i];
          d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
          turn[i] = d + SWIRL_TURNS * Math.PI * 2;
          hr[i] = Math.hypot(hx[i], hy[i]);
        } else {
          const f = (sx[i] - depth[i] - x0) / (x1 - x0);
          catchAt[i] =
            f > 1
              ? Infinity
              : strokeAt[b] + (strokeEnd[b] - strokeAt[b]) * Math.max(0, f);
        }
      }
    }
    states.set(r, {
      count,
      bars: n,
      readX,
      x0,
      x1,
      barOf,
      colOf,
      sx,
      sy,
      depth,
      rideY,
      hx,
      hy,
      lift,
      phase,
      catchAt,
      a0,
      r0,
      turn,
      hr,
      strokeAt,
      strokeEnd,
      landAt,
      swirlAt,
      kickAt: Float32Array.from(kicks, (q) => q.at),
      kickShake: Float32Array.from(kicks, (q) => q.shake),
      kickTick: Float32Array.from(kicks, (q) => q.tick),
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || !atlas || !glow) return;
    const now = r.startedAt + ms;
    if (ms < BLOW_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + (0.4 * ms) / BLOW_MS),
      );
    while (r.kicked < s.kickAt.length && ms >= s.kickAt[r.kicked]) {
      const k = r.kicked;
      if (s.kickShake[k] > 0) r.shake(s.kickShake[k]);
      if (s.kickTick[k] > 0) playSpinTick(s.kickTick[k]);
      r.kicked++;
    }
    drawDetonation(ctx, ORIGIN, ms - BLOW_MS * 0.5, BLOW_UP.size, now);
    const n = Math.min(s.bars, bars.length);
    const ownLand = s.landAt[0];
    // its own pile's tremble
    const swirl = clamp01((ms - s.swirlAt) / SWIRL_MS);
    const shake = clamp01((swirl - (1 - TREMBLE_SHARE)) / TREMBLE_SHARE);
    const tick = Math.floor(ms / TREMBLE_MS);
    const shiverX = shake * TREMBLE * (holeHash(tick, 7312) * 2 - 1);
    const shiverY = shake * TREMBLE * (holeHash(tick, 7313) * 2 - 1);
    const flung = (ms - BLOW_MS) / FLING_MS;
    if (flung >= 0 && ms < ownLand + OWN_POP_MS) {
      const cellW = CELL_W * SPRITE_SCALE;
      const cellH = CELL_H * SPRITE_SCALE;
      for (let i = 0; i < s.count; i++) {
        const b = s.barOf[i];
        if (b >= n) continue;
        const own = b === 0;
        const land = s.landAt[b];
        const popMs = own ? OWN_POP_MS : POP_MS;
        if (ms >= land + popMs) continue;
        const bx = bars[b].x;
        const by = bars[b].y;
        const ph = s.phase[i];
        const fx = Math.sin(ms * FLUTTER_RATE + ph) * FLUTTER;
        const fy = Math.cos(ms * FLUTTER_RATE * 1.3 + ph) * FLUTTER * 0.6;
        let flip = Math.abs(Math.cos(ms * FLIP_RATE + ph));
        let size = 1;
        let x: number;
        let y: number;
        if (flung < 1) {
          spot.x = bx + s.sx[i];
          spot.y = by + s.sy[i];
          flingOut(ORIGIN, spot, s.lift[i], flung, bit);
          x = bit.x - bx;
          y = bit.y - by;
        } else if (ms >= land) {
          // popping out of the pile
          const pp = (ms - land) / popMs;
          const e = easeOut(pp);
          const far = (own ? OWN_POP : POP) * (0.5 + s.lift[i]);
          x = s.readX + s.hx[i] * (1 + far * e);
          y = PILE_Y + s.hy[i] * (1 + far * e) - POP_UP * e;
          size = 1 - pp;
        } else if (own) {
          if (ms < s.swirlAt) {
            x = s.sx[i] + fx;
            y = s.sy[i] + fy;
          } else {
            const ang = s.a0[i] + s.turn[i] * swirl * swirl;
            const rad = lerp(s.r0[i], s.hr[i], swirl ** 1.4);
            x = s.readX + shiverX + Math.cos(ang) * rad + fx * (1 - swirl);
            y = PILE_Y + shiverY + Math.sin(ang) * rad + fy * (1 - swirl);
            if (swirl > 0.9) flip = 1;
          }
        } else {
          const at = s.strokeAt[b];
          const end = s.strokeEnd[b];
          const caught = s.catchAt[i];
          if (ms < caught) {
            x = s.sx[i] + fx;
            y = s.sy[i] + fy;
          } else {
            const front = lerp(s.x0, s.x1, clamp01((ms - at) / (end - at)));
            x = front + s.depth[i];
            const ride = easeOut(clamp01((ms - caught) / RIDE_MS));
            y = lerp(s.sy[i] + fy, s.rideY[i], ride);
          }
          if (ms >= end) {
            const g = easeOut((ms - end) / GATHER_MS);
            x = lerp(x, s.readX + s.hx[i], g);
            y = lerp(y, PILE_Y + s.hy[i], g);
            flip = lerp(flip, 1, g);
          }
        }
        const w = PW * (0.2 + 0.8 * flip) * size;
        const h = PH * size;
        ctx.drawImage(
          atlas,
          0,
          s.colOf[i] * cellH,
          cellW,
          cellH,
          bx + x - w / 2,
          by + y - h / 2,
          w,
          h,
        );
      }
    }
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    // the sweeping fronts
    for (let b = 1; b < n; b++) {
      const at = s.strokeAt[b];
      const end = s.strokeEnd[b];
      if (ms < at || ms >= end + FRONT_FADE) continue;
      const front = lerp(s.x0, s.x1, clamp01((ms - at) / (end - at)));
      ctx.globalAlpha = ms < end ? 1 : 1 - (ms - end) / FRONT_FADE;
      ctx.drawImage(
        glow,
        bars[b].x + front - GLOW_W * ARC_AT,
        bars[b].y - GLOW_H / 2,
        GLOW_W,
        GLOW_H,
      );
    }
    ctx.globalAlpha = 1;
    beginLightBatch(ctx);
    for (let b = 1; b < n; b++) {
      const since = ms - s.landAt[b];
      if (since >= 0 && since < LAND_FLASH_MS)
        stampGlimmer(
          ctx,
          bars[b].x + s.readX,
          bars[b].y + PILE_Y - HEAP_H * 0.4,
          BLAST * (1 - since / LAND_FLASH_MS),
          b,
          COLOR.white,
        );
    }
    // its own pile glowing up as it swirls in
    if (n > 0 && swirl > 0 && ms < ownLand)
      stampGlimmer(
        ctx,
        bars[0].x + s.readX + shiverX,
        bars[0].y + PILE_Y - HEAP_H * OWN_HEAP * 0.4 + shiverY,
        lerp(PILE_GLOW[0], PILE_GLOW[1], swirl * swirl),
        0,
        COLOR.heavenlyGold,
      );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    spot.x = bars[0].x + s.readX;
    spot.y = bars[0].y + PILE_Y - HEAP_H * OWN_HEAP * 0.4;
    drawDetonation(ctx, spot, ms - ownLand, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
