// Dynamite, a floor crit: the number bursts into dynamite sticks of light
// standing in a row along every bar in view (a fat bundle on its own), all
// tied by one long fuse snaking down the building. The fuse is lit and its
// spark races along it, quicker and quicker, every stick it passes throbbing
// and trembling ever faster. Then they go off: each bar's row pops stick by
// stick from end to end, its last stick the big one that levels it, bar
// after bar down the building, quicker each; its own bundle blows last in a
// cluster blast and the hardest shake
import { COLOR } from "../../../../palette";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { playCritExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { easeOut } from "../../../../shared/easing";
import { playSpinTick, playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

// the number trembling, swelling and bursting into the sticks
const IN_MS = 150;
const IN_TREMBLE = 10;
const BURST_FLASH = 230;
const BURST_FLASH_MS = 170;
// the sticks flying out of it onto their bars, a bar STAGGER_MS after the
// one above
const FLY_MS = 170;
const STAGGER_MS = 15;
// a bar's row: STICKS sticks REACH in from its ends; its own bundle
const STICKS = 5;
const REACH = 120;
const STICK_H = 78;
const STICK_W = 20;
const OWN_STICKS = 7;
const OWN_H = 124;
const OWN_W = 26;
const OWN_GAP = 22;
const OWN_FAN = 8;
const TAPE_W = 16;
// the fuse: lit FUSE_DELAY after the burst, its spark running it over
// FUSE_MS, leaving at EASE of its average speed and speeding up
const FUSE_DELAY = 60;
const FUSE_MS = 820;
const EASE = 0.55;
const FUSE_W = 6;
const FUSE_ALPHA = 0.5;
const FUSE_FADE_MS = 150;
const SPARK_GLOW = 62;
const SPARK_CORE = 24;
const SPARK_STAR = 42;
const SPITS = 8;
const SPIT_MS = 200;
const SPIT_SIZE = 18;
const END_FLASH = 200;
const END_FLASH_MS = 160;
// a lit stick throbs THROB_HZ plus THROB_PULSES more by its blast, trembling
const THROB_HZ = 2.5;
const THROB_PULSES = 7;
const THROB = 46;
const OWN_THROB = 72;
const TREMBLE = 4;
// the chain: bar k's row from BAR_GAP after the one above, its sticks
// POP_GAP apart, both quickening down the building; its own OWN_DELAY after
const BAR_GAP: [number, number] = [130, 60];
const POP_GAP: [number, number] = [48, 28];
const OWN_DELAY = 140;
const CLUSTER_MS = 24;
const CLUSTER_REACH = 0.8;
const OWN_SIDE_MS = 90;
const OWN_SIDE = 0.55;
// a pop: a flash and glimmers flung up and falling; the big one taller, a
// pillar of light shooting up
const POP_MS = 220;
const POP_R: [number, number] = [40, 110];
const BIG_R = 1.9;
const DEBRIS = 7;
const BIG_DEBRIS = 14;
const DEBRIS_MS = 380;
const DEBRIS_SPEED: [number, number] = [0.45, 1.1];
const DEBRIS_SIZE = 22;
const GRAVITY = 0.0018;
const PILLAR_MS = 200;
const PILLAR_H = 260;
const PILLAR_W = 50;
const POP_SHAKE = 0.3;
// full blasts: the last row's big stick, its own bundle and its side burst
const BLAST = 230;
const OWN_BLAST = 470;
const SIDE_BLAST = 280;
// shakes by step: a bar's big stick, its own bundle
const SHAKES = [1.1, 3.6];

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.35);

const SMALL = 0;
const BIG = 1;
const CLUSTER = 2;

interface Dynamite {
  order: number[];
  // bars other than its own, in the order the fuse runs them
  others: number;
  // the fuse's nodes this frame (the number, each row's two ends, the
  // bundle's top) and how far along it each lies, 0..1, from the plan
  px: Float64Array;
  py: Float64Array;
  cum: Float64Array;
  fuseAt: number;
  fuseEnd: number;
  // the sticks, others' rows then its own bundle: their bar (order index),
  // offset from its middle, when the spark lights them and when they pop
  stickK: Int32Array;
  stickDx: Float64Array;
  litAt: Float64Array;
  popAt: Float64Array;
  kind: Uint8Array;
  // the pops by time
  kicks: Int32Array;
  kicked: number;
  ownAt: number;
  lastBig: number;
  side: number;
  lit: boolean;
  banged: boolean;
}
const states = new WeakMap<Running, Dynamite>();
const spot: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };

// the fuse's run 0..1 at u 0..1 of its time, and back
const run = (u: number) => u * (EASE + (1 - EASE) * u);
const runTime = (l: number) =>
  (-EASE + Math.sqrt(EASE * EASE + 4 * (1 - EASE) * l)) / (2 * (1 - EASE));

function place(s: Dynamite, r: Running, bars: Point[]): void {
  const reach = r.play.barHalfWidth - REACH;
  s.px[0] = 0;
  s.py[0] = 0;
  for (let k = 0; k < s.others; k++) {
    const bar = bars[s.order[k]];
    const dir = k % 2 === 0 ? 1 : -1;
    s.px[1 + 2 * k] = bar.x - dir * reach;
    s.px[2 + 2 * k] = bar.x + dir * reach;
    s.py[1 + 2 * k] = s.py[2 + 2 * k] = bar.y - STICK_H / 2;
  }
  const last = 1 + 2 * s.others;
  s.px[last] = bars[0].x;
  s.py[last] = bars[0].y - OWN_H / 2;
}

// the spark at ms into `out`; the fuse segment it's on
function sparkAt(s: Dynamite, ms: number, out: Point): number {
  const l = run(clamp01((ms - s.fuseAt) / FUSE_MS));
  const last = s.cum.length - 1;
  let k = 0;
  while (k < last - 1 && s.cum[k + 1] < l) k++;
  const span = s.cum[k + 1] - s.cum[k];
  const f = span > 0 ? clamp01((l - s.cum[k]) / span) : 1;
  out.x = lerp(s.px[k], s.px[k + 1], f);
  out.y = lerp(s.py[k], s.py[k + 1], f);
  return k;
}

function plan(r: Running, bars: Point[]): Dynamite {
  const order = ownLast(bars);
  const others = order.length - 1;
  const nodes = 2 + 2 * others;
  const sticks = others * STICKS + OWN_STICKS;
  const fuseAt = IN_MS + FUSE_DELAY;
  const fuseEnd = fuseAt + FUSE_MS;
  const s: Dynamite = {
    order,
    others,
    px: new Float64Array(nodes),
    py: new Float64Array(nodes),
    cum: new Float64Array(nodes),
    fuseAt,
    fuseEnd,
    stickK: new Int32Array(sticks),
    stickDx: new Float64Array(sticks),
    litAt: new Float64Array(sticks),
    popAt: new Float64Array(sticks),
    kind: new Uint8Array(sticks),
    kicks: new Int32Array(sticks),
    kicked: 0,
    ownAt: 0,
    lastBig: -1,
    side: holeHash(r.value, 4401) < 0.5 ? -1 : 1,
    lit: false,
    banged: false,
  };
  place(s, r, bars);
  let total = 0;
  for (let k = 1; k < nodes; k++) {
    total += Math.hypot(s.px[k] - s.px[k - 1], s.py[k] - s.py[k - 1]);
    s.cum[k] = total;
  }
  for (let k = 1; k < nodes; k++) s.cum[k] = total > 0 ? s.cum[k] / total : 1;

  const reach = r.play.barHalfWidth - REACH;
  let start = fuseEnd;
  let lastPop = fuseEnd;
  for (let k = 0; k < others; k++) {
    const q = others > 1 ? k / (others - 1) : 0;
    const gap = lerp(POP_GAP[0], POP_GAP[1], q);
    const dir = k % 2 === 0 ? 1 : -1;
    const a = 1 + 2 * k;
    for (let j = 0; j < STICKS; j++) {
      const i = k * STICKS + j;
      const f = j / (STICKS - 1);
      s.stickK[i] = k;
      s.stickDx[i] = dir * (2 * f - 1) * reach;
      s.litAt[i] =
        fuseAt + FUSE_MS * runTime(s.cum[a] + (s.cum[a + 1] - s.cum[a]) * f);
      s.popAt[i] = start + j * gap;
      s.kind[i] = j === STICKS - 1 ? BIG : SMALL;
    }
    lastPop = Math.max(lastPop, start + (STICKS - 1) * gap);
    start += lerp(BAR_GAP[0], BAR_GAP[1], q);
  }
  if (others) s.lastBig = others * STICKS - 1;
  s.ownAt = others ? lastPop + OWN_DELAY : fuseEnd + FUSE_DELAY;
  // its own bundle's cluster: pops spreading out from its middle
  for (let c = 0; c < OWN_STICKS; c++) {
    const i = others * STICKS + c;
    const out = Math.ceil(c / 2) / Math.ceil((OWN_STICKS - 1) / 2);
    s.stickK[i] = others;
    s.stickDx[i] = (c % 2 ? 1 : -1) * out * reach * CLUSTER_REACH;
    s.litAt[i] = fuseEnd;
    s.popAt[i] = s.ownAt + c * CLUSTER_MS;
    s.kind[i] = CLUSTER;
  }
  const kicks = Array.from({ length: sticks }, (_, i) => i).sort(
    (a, b) => s.popAt[a] - s.popAt[b],
  );
  for (let i = 0; i < sticks; i++) s.kicks[i] = kicks[i];
  return s;
}

// a lit stick's throb: a gold glow and white core, quicker and bigger as
// its blast closes in
function throb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  b: number,
  ms: number,
): number {
  const phase = (ms / 1000) * THROB_HZ + THROB_PULSES * b * b;
  const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const beat = wave * wave;
  ctx.globalAlpha = (0.45 + 0.55 * beat) * (0.5 + 0.5 * b);
  drawGlow(ctx, GOLD, x, y, size * (0.9 + (0.5 + 0.6 * b) * beat));
  ctx.globalAlpha = beat;
  drawGlow(ctx, WHITE, x, y, size * 0.45 * (0.7 + 0.6 * beat) * (1 + 0.3 * b));
  ctx.globalAlpha = 1;
  return beat;
}

registerFloorCrit("dynamiteCrit", {
  plan(r, bars, hit) {
    const s = plan(r, bars);
    states.set(r, s);
    for (let k = 0; k < s.others; k++)
      hit(s.order[k], s.popAt[k * STICKS + STICKS - 1], 0);
    hit(0, s.ownAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    place(s, r, bars);
    const now = r.startedAt + ms;
    const ownBar = bars[0];

    // the number trembling and swelling till it bursts
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      const shiver = IN_TREMBLE * p;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        Math.sin(ms * 0.11) * shiver,
        Math.cos(ms * 0.13) * shiver,
        r.flashFont * lerp(1, 1.25, p * p),
        { alpha: 1 - clamp01((p - 0.6) / 0.4) },
      );
    }

    // the pops' kicks: a small one rattles and ticks, rising
    const count = s.kicks.length;
    while (s.kicked < count && s.popAt[s.kicks[s.kicked]] <= ms) {
      const i = s.kicks[s.kicked++];
      if (s.kind[i] !== SMALL) continue;
      r.shake(POP_SHAKE);
      playSpinTick(lerp(1.1, 1.9, s.kicked / count));
    }
    if (!s.lit && ms >= s.fuseAt) {
      s.lit = true;
      playSwoosh();
    }
    if (!s.banged && ms >= s.ownAt) {
      s.banged = true;
      playCritExplosion();
    }

    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);

    // the burst's flash where the number was
    const burst = ms - IN_MS;
    if (burst >= 0 && burst < BURST_FLASH_MS) {
      const p = burst / BURST_FLASH_MS;
      ctx.globalAlpha = (1 - p) * (1 - p);
      drawGlow(ctx, GOLD, 0, 0, BURST_FLASH * (0.6 + 0.4 * easeOut(p)));
      drawGlow(ctx, WHITE, 0, 0, BURST_FLASH * 0.5);
      ctx.globalAlpha = 1;
    }

    // the fuse still to burn, from the spark on
    if (ms >= IN_MS && ms < s.fuseEnd) {
      const alpha = FUSE_ALPHA * clamp01((ms - IN_MS) / FUSE_FADE_MS);
      let k = 0;
      if (ms >= s.fuseAt) {
        k = sparkAt(s, ms, from);
      } else {
        from.x = s.px[0];
        from.y = s.py[0];
      }
      for (let n = k + 1; n < s.px.length; n++) {
        to.x = s.px[n];
        to.y = s.py[n];
        drawBeam(ctx, from, to, FUSE_W, alpha);
        from.x = to.x;
        from.y = to.y;
      }
    }

    // the sticks: flying out, standing, lit and throbbing till they pop
    const half = OWN_STICKS / 2 - 0.5;
    for (let i = 0; i < s.popAt.length; i++) {
      if (ms >= s.popAt[i]) continue;
      const k = s.stickK[i];
      const own = k === s.others;
      const flyFrom = IN_MS + k * STAGGER_MS;
      if (ms < flyFrom) continue;
      const bar = own ? ownBar : bars[s.order[k]];
      const c = i - s.others * STICKS;
      const dx = own ? (c - half) * OWN_GAP : s.stickDx[i];
      const h = own ? OWN_H : STICK_H;
      const u = easeOut(clamp01((ms - flyFrom) / FLY_MS));
      let x = lerp(0, bar.x + dx, u);
      const y = lerp(0, bar.y, u);
      const lit = ms >= s.litAt[i];
      const b = lit ? clamp01((ms - s.fuseAt) / (s.popAt[i] - s.fuseAt)) : 0;
      if (lit) x += Math.sin(ms * 0.8 + i * 1.7) * TREMBLE * b * b;
      const beat = lit ? throb(ctx, x, y, own ? OWN_THROB : THROB, b, ms) : 0;
      const tall = h * lerp(0.4, 1, u) * 0.5;
      const fan = own ? (c - half) * OWN_FAN : 0;
      from.x = x - fan * 0.4;
      from.y = y + tall;
      to.x = x + fan;
      to.y = y - tall;
      drawBeam(
        ctx,
        from,
        to,
        (own ? OWN_W : STICK_W) * (1 + 0.3 * beat * b),
        lit ? 0.7 + 0.3 * beat : 0.55,
      );
    }
    // the tape round its own bundle
    if (ms >= IN_MS + s.others * STAGGER_MS + FLY_MS && ms < s.ownAt) {
      from.x = ownBar.x - (half + 0.7) * OWN_GAP;
      to.x = ownBar.x + (half + 0.7) * OWN_GAP;
      from.y = to.y = ownBar.y;
      drawBeam(ctx, from, to, TAPE_W, 0.85);
    }

    // the spark racing down the fuse, spitting sparks, and its flash on
    // reaching the bundle
    if (ms >= s.fuseAt && ms < s.fuseEnd) {
      sparkAt(s, ms, spot);
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(ms * 0.07);
      drawGlow(ctx, GOLD, spot.x, spot.y, SPARK_GLOW);
      drawGlow(ctx, WHITE, spot.x, spot.y, SPARK_CORE);
      ctx.globalAlpha = 1;
      stampGlimmer(ctx, spot.x, spot.y, SPARK_STAR, ms * 0.03, COLOR.white);
      for (let q = 0; q < SPITS; q++) {
        const age = (ms + (q * SPIT_MS) / SPITS) % SPIT_MS;
        const born = ms - age;
        if (born < s.fuseAt) continue;
        const seed = Math.floor((ms + (q * SPIT_MS) / SPITS) / SPIT_MS);
        sparkAt(s, born, to);
        const a = -Math.PI * (0.1 + 0.8 * holeHash(seed * SPITS + q, 4402));
        const v = lerp(0.3, 0.7, holeHash(seed * SPITS + q, 4403));
        const fade = 1 - age / SPIT_MS;
        stampGlimmer(
          ctx,
          to.x + Math.cos(a) * v * age,
          to.y + Math.sin(a) * v * age + 0.5 * GRAVITY * age * age,
          SPIT_SIZE * fade,
          q,
          COLOR.heavenlyGold,
        );
      }
    }
    const end = ms - s.fuseEnd;
    if (end >= 0 && end < END_FLASH_MS) {
      const last = s.px.length - 1;
      ctx.globalAlpha = 1 - end / END_FLASH_MS;
      drawGlow(ctx, GOLD, s.px[last], s.py[last], END_FLASH);
      drawGlow(ctx, WHITE, s.px[last], s.py[last], END_FLASH * 0.45);
      ctx.globalAlpha = 1;
    }

    // the pops: flashes and flung glimmers; the big ones a pillar too
    for (let i = 0; i < s.popAt.length; i++) {
      const age = ms - s.popAt[i];
      if (age < 0 || age >= DEBRIS_MS) continue;
      const k = s.stickK[i];
      const bar = k === s.others ? ownBar : bars[s.order[k]];
      const x = bar.x + s.stickDx[i];
      const y = bar.y;
      const big = s.kind[i] !== SMALL;
      if (age < POP_MS) {
        const p = age / POP_MS;
        const radius = lerp(POP_R[0], POP_R[1], easeOut(p)) * (big ? BIG_R : 1);
        ctx.globalAlpha = (1 - p) * (1 - p);
        drawGlow(ctx, GOLD, x, y, radius);
        drawGlow(ctx, WHITE, x, y, radius * 0.5);
        ctx.globalAlpha = 1;
      }
      if (big && age < PILLAR_MS) {
        const p = age / PILLAR_MS;
        from.x = to.x = x;
        from.y = y;
        to.y = y - PILLAR_H * easeOut(Math.min(1, p * 2));
        drawBeam(ctx, from, to, PILLAR_W * (1 - p), 1 - p);
      }
      const n = big ? BIG_DEBRIS : DEBRIS;
      const fade = 1 - age / DEBRIS_MS;
      for (let d = 0; d < n; d++) {
        const seed = i * BIG_DEBRIS + d;
        const a = -Math.PI * (0.05 + 0.9 * holeHash(seed, 4404));
        const v =
          lerp(DEBRIS_SPEED[0], DEBRIS_SPEED[1], holeHash(seed, 4405)) *
          (big ? 1.3 : 1);
        stampGlimmer(
          ctx,
          x + Math.cos(a) * v * age,
          y + Math.sin(a) * v * age + 0.5 * GRAVITY * age * age,
          DEBRIS_SIZE * fade * (big ? 1.2 : 1),
          d + age * 0.01,
          COLOR.heavenlyGold,
        );
      }
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    // the full blasts, never more than three alive: the last row's big
    // stick, its own bundle and the side burst of its cluster
    if (s.lastBig >= 0) {
      const bar = bars[s.order[s.others - 1]];
      spot.x = bar.x + s.stickDx[s.lastBig];
      spot.y = bar.y;
      drawDetonation(ctx, spot, ms - s.popAt[s.lastBig], BLAST, now);
    }
    drawDetonation(ctx, ownBar, ms - s.ownAt, OWN_BLAST, now);
    spot.x = ownBar.x + s.side * (r.play.barHalfWidth - REACH) * OWN_SIDE;
    spot.y = ownBar.y;
    drawDetonation(ctx, spot, ms - s.ownAt - OWN_SIDE_MS, SIDE_BLAST, now);
  },
  tailMs: DETONATION_MS + OWN_SIDE_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
