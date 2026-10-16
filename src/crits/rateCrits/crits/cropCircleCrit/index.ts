// Crop Circle, a rate crit: the number spits out a small glowing saucer that
// skims down the bars, snapping onto each readout and hovering there, its
// tractor beam pressing a crop circle out flat under the readout (rings,
// satellite circles round them, arcs joining them, a different pattern on
// every bar) that whips round in one fast spin, faster each turn with a jolt,
// and erupts in a pillar of light up through the readout as it turns over;
// the saucer skims on quicker each time. Over its own bar it hovers longest,
// trembling and glowing white-hot, pressing the biggest, most intricate
// circle of all, which spins up turn by jolting turn and erupts in the
// tallest pillar, the saucer shooting up it in the big blast. Each bar's
// next payouts reap its whole building, paying more for every open floor
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  summonTurn,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { playSpinTick, playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the saucer out of the number at START_MS, snapping onto each readout in a
// FLY_MS skim (closing) arcing SKIM_ARC px up, pressing for PRESS_MS
// (closing), all of that within SPAN_MS; OWN_FLY_MS onto its own
const START_MS = 60;
const FLY_MS: [number, number] = [170, 95];
const PRESS_MS: [number, number] = [200, 110];
const SPAN_MS = 820;
const OWN_FLY_MS = 120;
const SKIM_ARC = 60;
// a circle erupting SPIN_MS after it's pressed, turning TURNS times; its own
// HUB_SPIN_MS after, at least HUB_AFTER after the last small one
const SPIN_MS = 560;
const TURNS = 4;
const HUB_SPIN_MS = 900;
const HUB_AFTER = 190;
const HUB_TURNS = 8;
// the circles RADIUS round (its own HUB_RADIUS) under the readout (READOUT of
// a bar's half width out) by DOWN px; the saucer hovering HOVER px over them
const RADIUS = 100;
const HUB_RADIUS = 215;
const READOUT = 0.6;
const DOWN = 40;
const CONTACT_Y = -20;
const HOVER = 100;
// a circle swelling JOLT more on each turn, back over JOLT_MS
const JOLT = 0.12;
const JOLT_MS = 90;
const PILLAR = 620;
const HUB_PILLAR = 1250;
const FLASH = 170;
const FLASH_MS = 180;
const HUB_BLAST = 400;
// the saucer: a WISP wisp in a SAUCER px disc with LIGHTS lights spinning
// round its rim, trembling up to TREMBLE px over its own; shooting up the
// pillar at LAUNCH px a ms for LAUNCH_MS
const WISP = WISP_SIZE * 0.9;
const SAUCER = 38;
const LIGHTS = 6;
const LIGHT = 13;
const DOME = 34;
const TREMBLE = 7;
const LAUNCH = 3.2;
const LAUNCH_MS = 240;
// its tractor beam BEAM px wide, its own swelling to HUB_BEAM
const BEAM = 26;
const HUB_BEAM = 70;
const REV_SHAKE = 0.5;
// shakes by step: -, a small one, its own
const SHAKES = [0.4, 1, 3];

// the circles lie flat, as squashed as the summon lib's
const SQ = 0.3;
// the crop patterns pressed round a circle's rings: satellite circles
// `n` round at `out` of the radius, each `r` of it, turning `dir` times the
// rings, joined by arcs along `out` if `arc`; a tail of `chain` shrinking
// circles off its left
interface Sats {
  n: number;
  out: number;
  r: number;
  dir: number;
  arc: boolean;
}
interface Crop {
  sats: readonly Sats[];
  chain: number;
}
const CROPS: readonly Crop[] = [
  { sats: [{ n: 4, out: 1.22, r: 0.2, dir: 1, arc: false }], chain: 0 },
  {
    sats: [
      { n: 6, out: 1.12, r: 0.11, dir: -1, arc: true },
      { n: 3, out: 0.45, r: 0.12, dir: 2, arc: false },
    ],
    chain: 0,
  },
  { sats: [{ n: 3, out: 1.3, r: 0.26, dir: 1.4, arc: true }], chain: 2 },
  {
    sats: [
      { n: 8, out: 1.15, r: 0.09, dir: -0.7, arc: true },
      { n: 4, out: 0.86, r: 0.1, dir: 1.5, arc: false },
    ],
    chain: 0,
  },
  { sats: [{ n: 5, out: 0.5, r: 0.15, dir: -2, arc: true }], chain: 3 },
];
const HUB_CROP: Crop = {
  sats: [
    { n: 10, out: 1.24, r: 0.13, dir: -1, arc: true },
    { n: 6, out: 0.86, r: 0.08, dir: 1.6, arc: false },
    { n: 4, out: 0.45, r: 0.11, dir: -2.4, arc: true },
  ],
  chain: 4,
};
// the patterns pressed in over CROP_MS once the inner ring's down, fading
// with the circle; the tail's circles CHAIN_R of the radius, CHAIN_SHRINK as
// big each, CHAIN_LINK apart
const CROP_MS = 200;
const CROP_FADE_MS = 250;
const CROP_LINE = 0.03;
const CHAIN_R = 0.24;
const CHAIN_SHRINK = 0.72;
const CHAIN_LINK = 0.16;
const GLINT = 0.09;

const FLASH_STOPS = fadeStops(COLOR.heavenlyGold);
const DOME_STOPS = fadeStops(COLOR.white, 0.25);
const TAU = Math.PI * 2;

interface Circle {
  bar: number;
  summon: Summon;
  crop: Crop;
  radius: number;
  at: Point;
}
interface State {
  // in skim order, its own last; the saucer onto each at arrive, off at leave
  circles: Circle[];
  arrive: number[];
  leave: number[];
  launchMs: number;
  swooshed: number;
}
const states = new WeakMap<Running, State>();
const saucer: Point = { x: 0, y: 0 };
const beamTo: Point = { x: 0, y: 0 };
const readout: Point = { x: 0, y: 0 };

// the saucer's path, read by its wisp's trail: the state being drawn
let pathState: State | null = null;
let pathBars: Point[] = [];
let pathHalf = 0;
const pathPoint: Point = { x: 0, y: 0 };

function hoverAt(bar: Point, into: Point): Point {
  into.x = bar.x + pathHalf * READOUT;
  into.y = bar.y + DOWN - HOVER;
  return into;
}

function pathAt(s: State, ms: number, into: Point): Point | null {
  if (ms < START_MS) return null;
  const last = s.circles.length - 1;
  let px = 0;
  let py = 0;
  let from = START_MS;
  for (let i = 0; i <= last; i++) {
    const bar = pathBars[s.circles[i].bar];
    if (!bar) return null;
    hoverAt(bar, into);
    const sx = into.x;
    const sy = into.y;
    if (ms < s.arrive[i]) {
      const t = clamp01((ms - from) / Math.max(1, s.arrive[i] - from));
      const e = 1 - (1 - t) * (1 - t);
      into.x = lerp(px, sx, e);
      into.y = lerp(py, sy, e) - Math.sin(Math.PI * t) * SKIM_ARC;
      return into;
    }
    if (ms < s.leave[i] || i === last) {
      if (i === last && ms >= s.launchMs) {
        into.y = sy - (ms - s.launchMs) * LAUNCH;
        return into;
      }
      const build =
        i === last
          ? clamp01((ms - s.arrive[i]) / Math.max(1, s.launchMs - s.arrive[i]))
          : 0;
      into.x = sx + Math.sin(ms * 0.9) * TREMBLE * build * build;
      into.y = sy + Math.sin(ms * 0.02) * 4;
      return into;
    }
    px = sx;
    py = sy;
    from = s.leave[i];
  }
  return null;
}
const saucerAt = (ms: number): Point | null =>
  pathState ? pathAt(pathState, ms, pathPoint) : null;

// a circle's crop pattern: its satellites, the arcs joining them and its tail
function drawCrop(
  ctx: CanvasRenderingContext2D,
  s: Summon,
  crop: Crop,
  ms: number,
  at: Point,
  radius: number,
): void {
  if (ms < s.innerMs) return;
  const fade = 1 - clamp01((ms - s.eruptMs) / CROP_FADE_MS);
  if (fade <= 0) return;
  const grow = clamp01((ms - s.innerMs) / CROP_MS);
  const turn = summonTurn(s, ms);
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * fade;
  ctx.beginPath();
  for (let k = 0; k < crop.sats.length; k++) {
    const ring = crop.sats[k];
    const out = radius * ring.out;
    const sr = Math.max(0, radius * ring.r * grow);
    const gap = (ring.r / ring.out) * 1.15;
    const span = TAU / ring.n - 2 * gap;
    for (let i = 0; i < ring.n; i++) {
      const a = turn * ring.dir + (i / ring.n) * TAU;
      const cx = at.x + Math.cos(a) * out;
      const cy = at.y + Math.sin(a) * out * SQ;
      ctx.moveTo(cx + sr, cy);
      ctx.ellipse(cx, cy, sr, sr * SQ, 0, 0, TAU);
      if (!ring.arc || span <= 0) continue;
      const a0 = a + gap;
      ctx.moveTo(at.x + Math.cos(a0) * out, at.y + Math.sin(a0) * out * SQ);
      ctx.ellipse(at.x, at.y, out, out * SQ, 0, a0, a0 + span * grow);
    }
  }
  let x = at.x - radius;
  for (let k = 0; k < crop.chain; k++) {
    const full = radius * CHAIN_R * CHAIN_SHRINK ** k;
    const cr = Math.max(0, full * grow);
    ctx.moveTo(x, at.y);
    x -= radius * CHAIN_LINK * grow;
    ctx.lineTo(x, at.y);
    const cx = x - full;
    ctx.moveTo(cx + cr, at.y);
    ctx.ellipse(cx, at.y, cr, cr * SQ, 0, 0, TAU);
    x = cx - full;
  }
  ctx.lineWidth = radius * CROP_LINE;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
  ctx.lineWidth = radius * CROP_LINE * 0.35;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
  beginLightBatch(ctx);
  const ring = crop.sats[0];
  if (ring) {
    const out = radius * ring.out;
    for (let i = 0; i < ring.n; i++) {
      const a = turn * ring.dir + (i / ring.n) * TAU;
      stampGlimmer(
        ctx,
        at.x + Math.cos(a) * out,
        at.y + Math.sin(a) * out * SQ,
        radius * GLINT * grow,
        i + 60,
        COLOR.white,
      );
    }
  }
  endLightBatch(ctx);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
}

// how much a circle swells on its latest turn
function jolt(s: Summon, ms: number): number {
  let since = Infinity;
  for (let k = s.revs.length - 1; k >= 0; k--)
    if (s.revs[k] <= ms) {
      since = ms - s.revs[k];
      break;
    }
  return 1 + JOLT * Math.max(0, 1 - since / JOLT_MS);
}

// the saucer's disc round its wisp, lights racing round its rim
function drawSaucer(
  ctx: CanvasRenderingContext2D,
  at: Point,
  now: number,
  heat: number,
): void {
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  const w = SAUCER * (1 + 0.3 * heat);
  drawGlow(ctx, DOME_STOPS, at.x, at.y - 6, DOME * (1 + heat));
  ctx.beginPath();
  ctx.ellipse(at.x, at.y + 4, w, w * SQ, 0, 0, TAU);
  ctx.lineWidth = 7;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
  beginLightBatch(ctx);
  const spin = now * (0.012 + 0.03 * heat);
  for (let i = 0; i < LIGHTS; i++) {
    const a = spin + (i / LIGHTS) * TAU;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * w,
      at.y + 4 + Math.sin(a) * w * SQ,
      LIGHT * (1 + heat),
      i + 80,
      i % 2 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
}

// the next payouts paying `pay` times, `left` of them
interface Harvest {
  pay: number;
  left: number;
}
const harvests = defineBarEffect<Harvest>({
  payout: (v) => v.pay,
  onPayout: (v) => {
    if (v.left <= 1) return undefined;
    v.left--;
    return v;
  },
});

registerFloorCrit("cropCircleCrit", {
  reward(t) {
    t.flipRate();
    let open = 0;
    for (let i = 0; i < t.floors.length; i++) if (t.floors[i].unlocked) open++;
    const { perFloor, max, payouts, ownPayouts } = meta.values;
    const pay = Math.min(max, 1 + perFloor * open);
    harvests.set(t.floor, { pay, left: t.own ? ownPayouts : payouts });
    t.punch(`x${Math.round(pay * 10) / 10} Harvest`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const m = order.length - 1;
    let sum = 0;
    for (let i = 0; i < m; i++) {
      const f = i / Math.max(1, m - 1);
      sum += lerp(FLY_MS[0], FLY_MS[1], f) + lerp(PRESS_MS[0], PRESS_MS[1], f);
    }
    const scale = Math.min(1, SPAN_MS / Math.max(1, sum));
    const circles: Circle[] = [];
    const arrive: number[] = [];
    const leave: number[] = [];
    let t = START_MS;
    let lastErupt = 0;
    for (let i = 0; i < m; i++) {
      const f = i / Math.max(1, m - 1);
      t += lerp(FLY_MS[0], FLY_MS[1], f) * scale;
      arrive.push(t);
      const erupt = t + SPIN_MS;
      circles.push({
        bar: order[i],
        summon: planSummon(t, erupt, TURNS, summonLook(i + 1)),
        crop: CROPS[i % CROPS.length],
        radius: RADIUS,
        at: { x: 0, y: 0 },
      });
      hit(order[i], erupt, 1);
      lastErupt = erupt;
      t += lerp(PRESS_MS[0], PRESS_MS[1], f) * scale;
      leave.push(t);
    }
    t += m > 0 ? OWN_FLY_MS : FLY_MS[0];
    arrive.push(t);
    const hubErupt = Math.max(t + HUB_SPIN_MS, lastErupt + HUB_AFTER);
    leave.push(hubErupt);
    circles.push({
      bar: order[m] ?? 0,
      summon: planSummon(t, hubErupt, HUB_TURNS, summonLook(3)),
      crop: HUB_CROP,
      radius: HUB_RADIUS,
      at: { x: 0, y: 0 },
    });
    hit(0, hubErupt, 2);
    states.set(r, { circles, arrive, leave, launchMs: hubErupt, swooshed: 0 });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    const { circles } = s;
    const last = circles.length - 1;
    const hub = circles[last];
    if (!hub || !bars[hub.bar]) return;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    pathState = s;
    pathBars = bars;
    pathHalf = half;
    // a jolt and a tick on each turn of its own
    const revs = hub.summon.revs;
    while (r.kicked < revs.length && ms >= revs[r.kicked]) {
      r.shake(REV_SHAKE);
      playSpinTick(1 + r.kicked / revs.length);
      r.kicked++;
    }
    while (s.swooshed < last && ms >= s.leave[s.swooshed]) {
      playSwoosh();
      s.swooshed++;
    }
    for (let i = 0; i <= last; i++) {
      const c = circles[i];
      const bar = bars[c.bar];
      if (!bar) continue;
      c.at.x = bar.x + half * READOUT;
      c.at.y = bar.y + DOWN;
      const radius = c.radius * jolt(c.summon, ms);
      drawSummon(ctx, c.summon, ms, c.at, radius);
      drawCrop(ctx, c.summon, c.crop, ms, c.at, radius);
    }
    // the tractor beam onto the circle it's pressing
    const at = pathAt(s, ms, saucer);
    if (at) {
      for (let i = 0; i <= last; i++) {
        if (ms < s.arrive[i] || ms >= s.leave[i]) continue;
        const c = circles[i];
        const build =
          i === last
            ? clamp01((ms - s.arrive[i]) / Math.max(1, s.leave[i] - s.arrive[i]))
            : 0;
        beamTo.x = c.at.x;
        beamTo.y = c.at.y;
        const flicker = 0.8 + 0.2 * Math.sin(ms * 0.08);
        drawBeam(ctx, at, beamTo, lerp(BEAM, HUB_BEAM, build), flicker);
        break;
      }
    }
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    for (let i = 0; i < last; i++) {
      const c = circles[i];
      const bar = bars[c.bar];
      if (!bar) continue;
      drawSummonPillar(ctx, c.summon, ms, c.at, c.radius, PILLAR);
      const after = ms - c.summon.eruptMs;
      if (after < 0 || after >= FLASH_MS) continue;
      const u = after / FLASH_MS;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (1 - u);
      drawGlow(
        ctx,
        FLASH_STOPS,
        c.at.x,
        bar.y + CONTACT_Y,
        FLASH * (0.6 + 0.6 * u),
      );
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }
    drawSummonPillar(ctx, hub.summon, ms, hub.at, HUB_RADIUS, HUB_PILLAR);
    const heat =
      ms < s.arrive[last]
        ? 0
        : clamp01((ms - s.arrive[last]) / Math.max(1, s.launchMs - s.arrive[last]));
    if (at && ms < s.launchMs + LAUNCH_MS) {
      ctx.globalAlpha = alpha * (1 - clamp01((ms - s.launchMs) / LAUNCH_MS));
      drawSaucer(ctx, at, now, heat);
      ctx.globalAlpha = alpha;
    }
    drawWispBetween(
      ctx,
      saucerAt,
      ms,
      now,
      WISP * (1 + 0.4 * heat),
      heat,
      START_MS,
      s.launchMs + LAUNCH_MS,
    );
    readout.x = hub.at.x;
    readout.y = bars[hub.bar].y + CONTACT_Y;
    drawDetonation(ctx, readout, ms - hub.summon.eruptMs, HUB_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
