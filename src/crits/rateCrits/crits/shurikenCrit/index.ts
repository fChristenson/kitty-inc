// Shuriken, a rate crit: spinning throwing stars of light whip in off the
// screen's sides one after another, left, right, left, each slicing straight
// through a bar's readout in a streak: the cut flashes, the readout's glow
// splits and its halves slide apart spilling glitter, the readout turning
// over; the throws quicken while its own readout swells, trembling, the
// rumble rising, until two big stars cross through it in an X and its four
// pieces burst apart in the big blast. Each payout of the bar sends its next
// fill off in a flurry, for its next few payouts
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { COLOR } from "../../../../palette";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  sliceOffset,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import {
  drawBeam,
  drawBeamFlare,
} from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops, glowSprite } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01 } from "../../../../shared/twinkle";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
const IN_MS = 140;
// the readouts READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
// at least MIN_THROWS throws, the first cut at FIRST_CUT, the gaps closing
// over GAP_MS, squeezed into THROW_SPAN; each cut CUT_HALF px either side of
// the readout, swiped over CUT_MS (quickening), SLANT radians off level
const MIN_THROWS = 6;
const FIRST_CUT = IN_MS + 160;
const GAP_MS: [number, number] = [210, 70];
const THROW_SPAN = 820;
const CUT_MS: [number, number] = [80, 60];
const CUT_HALF = 120;
const SLANT: [number, number] = [0.12, 0.38];
// the stars thrown from OFF px past the screen's side, flying on EXIT px
// past the cut; STAR px round, spinning SPIN radians a ms, a streak TRAIL of
// their size behind
const OFF = 160;
const EXIT = 700;
const STAR = 70;
const SPIN = 0.045;
const TRAIL = 3.2;
const SLASH_W = 26;
const SPILL = 20;
const SPILL_N = 14;
// a readout's glow GLOW_R round, lighting up over GLOW_IN_MS as a star
// comes; once cut, its pieces GAP px apart, drifting DRIFT more, fading over
// SPLIT_MS; a flash FLASH px round over FLASH_MS at the cut
const GLOW_R = 72;
const GLOW_IN_MS = 140;
const GAP = 18;
const DRIFT = 46;
const SPLIT_MS = 360;
const FLASH = 110;
const FLASH_MS = 150;
// the climax CROSS_IN_MS after the last throw: two BIG stars from CROSS_FAR
// px off, CROSS_HALF px either side of its own readout, CROSS_GAP_MS apart
const CROSS_IN_MS = 170;
const CROSS_MS = 80;
const CROSS_GAP_MS = 50;
const CROSS_HALF = 270;
const CROSS_FAR = 900;
const BIG = 140;
const BIG_SPIN = 0.06;
const CROSS_W = 46;
const OWN_R = 120;
const OWN_GAP = 26;
const OWN_DRIFT = 300;
const OWN_SPILL = 34;
const OWN_SPILL_N = 26;
const OWN_FLASH = 240;
const OWN_BLAST = 320;
// its own readout charging over CHARGE_MS before the cross: trembling up to
// TREMBLE px, a flare FLARE round, the rumble's gaps and kicks closing up
const CHARGE_MS = 520;
const TREMBLE = 9;
const FLARE = 150;
const RUMBLE_GAP_MS: [number, number] = [130, 40];
const RUMBLE: [number, number] = [0.25, 1.2];
// shakes by step: a cut, a bar's reward cut, its own's
const SHAKES = [0.6, 1, 3];

const GLOW = fadeStops(COLOR.heavenlyGold, 0.3);
const FLASH_STOPS = fadeStops(COLOR.white, 0.2);

interface Cut {
  bar: number;
  // from its bar's middle
  slash: Slash;
  ux: number;
  uy: number;
  len: number;
  speed: number;
  // how far back along its line the star starts
  far: number;
  size: number;
  spin: number;
  phase: number;
  width: number;
  flash: number;
  spill: number;
  spillN: number;
}
interface Readout {
  bar: number;
  // its middle from its bar's
  x: number;
  y: number;
  radius: number;
  slashes: Slash[];
  firstAt: number;
  doneAt: number;
  // its pieces: wedges between bounds (radians, one past the last wrapping
  // round), each's middle from its bar's and the way out of it
  bounds: Float32Array;
  mids: Point[];
  outX: Float32Array;
  outY: Float32Array;
  gap: number;
  drift: number;
}
interface State {
  readouts: Readout[];
  own: Readout;
  cuts: Cut[];
  swooshMs: Float32Array;
  rumbleMs: Float32Array;
  rumble: Float32Array;
  chargeFrom: number;
  swooshed: number;
  rumbled: number;
}
const states = new WeakMap<Running, State>();

const apart: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };
let starSprite: HTMLCanvasElement | null = null;
const SPRITE = 128;

// a flurry: burst times as fast till `until`, each payout starting another,
// `left` payouts left
const flurries = defineBarEffect<{ left: number; until: number }>({
  speed: (v, now) => (now < v.until ? meta.values.burst : 1),
  onPayout: (v, now) =>
    v.left > 1
      ? { left: v.left - 1, until: now + meta.values.burstMs }
      : undefined,
});

// a four-bladed throwing star of light in a halo, drawn once
function buildStar(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPRITE;
  const g = canvas.getContext("2d")!;
  const h = SPRITE / 2;
  g.translate(h, h);
  const halo = g.createRadialGradient(0, 0, 0, 0, 0, h);
  halo.addColorStop(0, `${COLOR.heavenlyGold}cc`);
  halo.addColorStop(0.5, `${COLOR.heavenlyGold}44`);
  halo.addColorStop(1, `${COLOR.heavenlyGold}00`);
  g.fillStyle = halo;
  g.fillRect(-h, -h, SPRITE, SPRITE);
  const root = h * 0.24;
  const tip = h * 0.94;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    const a0 = a - Math.PI / 4;
    const a1 = a + Math.PI / 4;
    if (i === 0) g.moveTo(Math.cos(a0) * root, Math.sin(a0) * root);
    // a hooked leading edge out to the tip, a straight one back in
    g.quadraticCurveTo(
      Math.cos(a - 0.5) * h * 0.62,
      Math.sin(a - 0.5) * h * 0.62,
      Math.cos(a) * tip,
      Math.sin(a) * tip,
    );
    g.lineTo(Math.cos(a1) * root, Math.sin(a1) * root);
  }
  g.closePath();
  const body = g.createRadialGradient(0, 0, 0, 0, 0, tip);
  body.addColorStop(0, COLOR.white);
  body.addColorStop(0.4, COLOR.heavenlyGold);
  body.addColorStop(1, COLOR.amber);
  g.fillStyle = body;
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = COLOR.white;
  g.stroke();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(0, 0, root * 0.5, 0, TAU);
  g.fill();
  return canvas;
}

function makeReadout(
  bar: number,
  x: number,
  radius: number,
  gap: number,
  drift: number,
): Readout {
  return {
    bar,
    x,
    y: CONTACT_Y,
    radius,
    slashes: [],
    firstAt: 0,
    doneAt: 0,
    bounds: new Float32Array(1),
    mids: [],
    outX: new Float32Array(0),
    outY: new Float32Array(0),
    gap,
    drift,
  };
}

// a cut through the readout's middle along (ux, uy), and its star
function makeCut(
  ro: Readout,
  ux: number,
  uy: number,
  reach: number,
  startMs: number,
  swipeMs: number,
  size: number,
  spin: number,
  width: number,
  flash: number,
  spill: number,
  spillN: number,
  salt: number,
): Cut {
  const slash = planSlash(
    { x: ro.x - ux * reach, y: ro.y - uy * reach },
    { x: ro.x + ux * reach, y: ro.y + uy * reach },
    startMs,
    swipeMs,
  );
  ro.slashes.push(slash);
  return {
    bar: ro.bar,
    slash,
    ux,
    uy,
    len: reach * 2,
    speed: (reach * 2) / swipeMs,
    far: 0,
    size,
    spin,
    phase: hash01(salt, 7303) * TAU,
    width,
    flash,
    spill,
    spillN,
  };
}

// its pieces, once all its cuts (each through its middle) are planned
function cutUp(ro: Readout): void {
  const angles: number[] = [];
  for (const s of ro.slashes) {
    let a = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x);
    a = ((a % Math.PI) + Math.PI) % Math.PI;
    angles.push(a, a + Math.PI);
  }
  angles.sort((a, b) => a - b);
  const n = angles.length;
  ro.bounds = new Float32Array(n + 1);
  ro.outX = new Float32Array(n);
  ro.outY = new Float32Array(n);
  for (let i = 0; i < n; i++) ro.bounds[i] = angles[i];
  ro.bounds[n] = angles[0] + TAU;
  for (let i = 0; i < n; i++) {
    const m = (ro.bounds[i] + ro.bounds[i + 1]) / 2;
    ro.outX[i] = Math.cos(m);
    ro.outY[i] = Math.sin(m);
    ro.mids.push({
      x: ro.x + ro.outX[i] * ro.radius * 0.5,
      y: ro.y + ro.outY[i] * ro.radius * 0.5,
    });
  }
  ro.firstAt = ro.slashes[0].endMs;
  ro.doneAt = ro.slashes[ro.slashes.length - 1].endMs;
}

registerFloorCrit("shurikenCrit", {
  reward(t) {
    const { burstMs, payouts, ownPayouts } = meta.values;
    t.flipRate();
    flurries.set(t.floor, {
      left: t.own ? ownPayouts : payouts,
      until: t.now + burstMs,
    });
    t.punch("Flurry");
  },
  plan(r, bars, hit) {
    if (!starSprite) starSprite = buildStar();
    const rx = r.play.barHalfWidth * READOUT;
    const order = ownLast(bars);
    const others = order.length - 1;
    // the bars thrown at: every other one, or its own alone
    const pool = others > 0 ? others : 1;
    const throws = Math.max(pool, MIN_THROWS);
    const readouts: Readout[] = [];
    const cuts: Cut[] = [];
    const swooshes: number[] = [];
    let total = 0;
    for (let k = 1; k < throws; k++)
      total += lerp(GAP_MS[0], GAP_MS[1], k / (throws - 1));
    const squeeze = total > THROW_SPAN ? THROW_SPAN / total : 1;
    const edge = r.viewportWidth / 2 + OFF;
    let at = FIRST_CUT;
    let lastEnd = FIRST_CUT;
    for (let k = 0; k < throws; k++) {
      const u = k / Math.max(1, throws - 1);
      if (k > 0) at += lerp(GAP_MS[0], GAP_MS[1], u) * squeeze;
      const bar = others > 0 ? order[k % others] : 0;
      // thrown from the left and the right by turns, tilting up or down
      const side = k % 2 ? 1 : -1;
      const slant =
        lerp(SLANT[0], SLANT[1], hash01(k, 7301)) *
        (hash01(k, 7302) < 0.5 ? -1 : 1);
      const ux = -side * Math.cos(slant);
      const uy = Math.sin(slant);
      const ro = makeReadout(bar, rx, GLOW_R, GAP, DRIFT);
      const cut = makeCut(
        ro,
        ux,
        uy,
        CUT_HALF,
        at,
        lerp(CUT_MS[0], CUT_MS[1], u),
        STAR,
        SPIN * side,
        SLASH_W,
        FLASH,
        SPILL,
        SPILL_N,
        k,
      );
      cut.far = Math.max(
        200,
        (bars[bar].x + cut.slash.from.x - side * edge) / ux,
      );
      cutUp(ro);
      readouts.push(ro);
      cuts.push(cut);
      swooshes.push(at);
      hit(bar, cut.slash.endMs, others > 0 && k < others ? 1 : 0);
      lastEnd = cut.slash.endMs;
    }
    // the climax: two big stars crossing through its own readout in an X
    const crossAt = lastEnd + CROSS_IN_MS;
    const own = makeReadout(0, rx, OWN_R, OWN_GAP, OWN_DRIFT);
    const d = Math.SQRT1_2;
    const first = makeCut(
      own,
      d,
      d,
      CROSS_HALF,
      crossAt,
      CROSS_MS,
      BIG,
      BIG_SPIN,
      CROSS_W,
      OWN_FLASH,
      OWN_SPILL,
      OWN_SPILL_N,
      101,
    );
    const second = makeCut(
      own,
      -d,
      d,
      CROSS_HALF,
      crossAt + CROSS_GAP_MS,
      CROSS_MS,
      BIG,
      -BIG_SPIN,
      CROSS_W,
      OWN_FLASH,
      OWN_SPILL,
      OWN_SPILL_N,
      102,
    );
    first.far = second.far = CROSS_FAR;
    cutUp(own);
    readouts.push(own);
    cuts.push(first, second);
    swooshes.push(first.slash.startMs, second.slash.startMs);
    hit(0, first.slash.endMs, 0);
    hit(0, second.slash.endMs, 2);
    // the rumble, closing up and kicking harder as its own readout charges
    const chargeFrom = Math.max(IN_MS, first.slash.endMs - CHARGE_MS);
    const climax = second.slash.endMs;
    const kicks: number[] = [];
    for (let k = chargeFrom; k < climax; ) {
      kicks.push(k);
      k += lerp(
        RUMBLE_GAP_MS[0],
        RUMBLE_GAP_MS[1],
        (k - chargeFrom) / (climax - chargeFrom),
      );
    }
    const rumble = new Float32Array(kicks.length);
    for (let k = 0; k < kicks.length; k++)
      rumble[k] = lerp(
        RUMBLE[0],
        RUMBLE[1],
        (kicks[k] - chargeFrom) / (climax - chargeFrom),
      );
    states.set(r, {
      readouts,
      own,
      cuts,
      swooshMs: Float32Array.from(swooshes.sort((a, b) => a - b)),
      rumbleMs: Float32Array.from(kicks),
      rumble,
      chargeFrom,
      swooshed: 0,
      rumbled: 0,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || !starSprite) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    while (s.swooshed < s.swooshMs.length && ms >= s.swooshMs[s.swooshed]) {
      s.swooshed++;
      playSwoosh();
    }
    while (s.rumbled < s.rumbleMs.length && ms >= s.rumbleMs[s.rumbled]) {
      r.shake(s.rumble[s.rumbled]);
      s.rumbled++;
    }
    const own = s.own;
    const charge = clamp01((ms - s.chargeFrom) / (own.firstAt - s.chargeFrom));
    const tremble = ms < own.firstAt ? TREMBLE * charge * charge : 0;
    const shiverX = Math.sin(ms * 0.11) * tremble;
    const shiverY = Math.cos(ms * 0.137) * tremble;
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    const glow = glowSprite(GLOW);
    // the readouts' glow: lighting up whole, then in pieces sliding apart
    for (const ro of s.readouts) {
      const bar = bars[ro.bar];
      if (ms >= ro.doneAt + SPLIT_MS) continue;
      const isOwn = ro === own;
      let cx = bar.x + ro.x;
      let cy = bar.y + ro.y;
      if (ms < ro.firstAt) {
        let radius = ro.radius;
        let a: number;
        if (isOwn) {
          if (ms < s.chargeFrom) continue;
          cx += shiverX;
          cy += shiverY;
          radius *= lerp(0.5, 1, charge);
          a = 0.5 + 0.5 * charge;
        } else {
          a = clamp01((ms - (ro.slashes[0].startMs - GLOW_IN_MS)) / GLOW_IN_MS);
          if (a <= 0) continue;
        }
        ctx.globalAlpha = alpha * a;
        ctx.drawImage(glow, cx - radius, cy - radius, radius * 2, radius * 2);
        continue;
      }
      const f = clamp01((ms - ro.doneAt) / SPLIT_MS);
      const out = ro.drift * (1 - (1 - f) * (1 - f));
      const radius = ro.radius;
      ctx.globalAlpha = alpha * (1 - f);
      const n = ro.outX.length;
      for (let i = 0; i < n; i++) {
        sliceOffset(ro.slashes, ro.mids[i], ms, ro.gap, apart);
        ctx.save();
        ctx.translate(
          cx + apart.x + ro.outX[i] * out,
          cy + apart.y + ro.outY[i] * out,
        );
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, ro.bounds[i], ro.bounds[i + 1]);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(glow, -radius, -radius, radius * 2, radius * 2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = alpha;
    // its own readout's flare swelling as it charges
    if (ms >= s.chargeFrom && ms < own.firstAt) {
      spot.x = bars[own.bar].x + own.x + shiverX;
      spot.y = bars[own.bar].y + own.y + shiverY;
      drawBeamFlare(
        ctx,
        spot,
        FLARE * (0.3 + 0.7 * charge),
        0.4 + 0.6 * charge,
        now,
      );
    }
    // the cuts' streaks and the glitter spilling out of them
    for (const cut of s.cuts) {
      if (ms < cut.slash.startMs || ms > cut.slash.endMs + 500) continue;
      const bar = bars[cut.bar];
      ctx.save();
      ctx.translate(bar.x, bar.y);
      drawSlash(ctx, cut.slash, ms, cut.width, now);
      drawSliceSpill(ctx, cut.slash, ms, cut.spill, cut.spillN);
      ctx.restore();
    }
    // the stars, spinning, a streak of light behind each
    ctx.globalCompositeOperation = "lighter";
    for (const cut of s.cuts) {
      const along = (ms - cut.slash.startMs) * cut.speed;
      if (along < -cut.far || along > cut.len + EXIT) continue;
      const bar = bars[cut.bar];
      spot.x = bar.x + cut.slash.from.x + cut.ux * along;
      spot.y = bar.y + cut.slash.from.y + cut.uy * along;
      const a = along > cut.len ? 1 - (along - cut.len) / EXIT : 1;
      tail.x = spot.x - cut.ux * cut.size * TRAIL;
      tail.y = spot.y - cut.uy * cut.size * TRAIL;
      drawBeam(ctx, tail, spot, cut.size * 0.7, 0.85 * a);
      ctx.save();
      ctx.globalAlpha = alpha * a;
      ctx.translate(spot.x, spot.y);
      ctx.rotate(ms * cut.spin + cut.phase);
      ctx.drawImage(
        starSprite,
        -cut.size,
        -cut.size,
        cut.size * 2,
        cut.size * 2,
      );
      ctx.restore();
    }
    // a flash where each cut goes through
    beginLightBatch(ctx);
    for (const cut of s.cuts) {
      const since = ms - cut.slash.endMs;
      if (since < 0 || since >= FLASH_MS) continue;
      const t = since / FLASH_MS;
      const bar = bars[cut.bar];
      ctx.globalAlpha = alpha * (1 - t);
      drawGlow(
        ctx,
        FLASH_STOPS,
        bar.x + (cut.slash.from.x + cut.slash.to.x) / 2,
        bar.y + (cut.slash.from.y + cut.slash.to.y) / 2,
        cut.flash * (0.6 + 0.8 * t),
      );
    }
    endLightBatch(ctx);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
    // its own readout's pieces bursting apart in the big blast
    spot.x = bars[own.bar].x + own.x;
    spot.y = bars[own.bar].y + own.y;
    drawDetonation(ctx, spot, ms - own.doneAt, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
