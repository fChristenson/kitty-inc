// Paw Print, a button crit: the number bursts into hundreds of gold dots
// streaming out in swirls, faster and faster, drawing one giant cat paw
// print beside the column of buttons, its big pad first, then each toe bean
// with a click and a jolt; the finished paw blazes and trembles, then
// stamps: bean after bean shoots off into the buttons down the column, each
// a pop and a flash, quicker each, and the big pad winds back, swells and
// slams into its own button last in the biggest blast, the button turning
// over: each of its next taps also boosts every worker on the floor with
// the most workers
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { activateBoosted, type Floor } from "../../../../gameState";
import {
  shapeFill,
  type Shape,
} from "../../../../shared/animationStyles/drawing";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { playBloop, playSpinTick } from "../../../../sound";
import { BTN_W } from "../../../../floors/upgradeButton";
import { clickWorker, getRenderedWorkerCount } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// the paw PAW px from its middle to its edge (fitted between MIN_PAW and
// it), GAP px clear of the column's left end and EDGE px off the screen's
const PAW = 230;
const MIN_PAW = 120;
const EXTENT = 1.1;
const GAP = 50;
const EDGE = 30;
// in paw units: the pad PAD of it across, its middle and the toes' arc
// centred MID down, the toes on an arc ARC out from ANGLES[0] to ANGLES[1]
const PAD = 0.55;
const MID = 0.3;
const ARC = 0.82;
const ANGLES: [number, number] = [
  (-155 * Math.PI) / 180,
  (-25 * Math.PI) / 180,
];
const TOE = 0.24;
const TOE_LONG = 1.25;
const TOES = 4;
// PAD_DOTS on the pad, TOE_DOTS shared by the toes (each at least
// MIN_TOE_DOTS), each flying FLY_MS out of the number on a SWIRL bend,
// landing over FILL_MS, quicker and quicker (by FILL_EASE)
const PAD_DOTS = 170;
const TOE_DOTS = 170;
const MIN_TOE_DOTS = 22;
const FLY_MS = 150;
const SWIRL = 0.6;
const FILL_MS = 760;
const FILL_EASE = 0.55;
const DOT = 19;
// drawn, it blazes over BLAZE_MS, throbbing THROB_HZ and trembling up to
// TREMBLE px; then the toes shoot off over STAMP_MS (quickening by
// STAMP_EASE), each flying TOE_FLY_MS on a HOP px hop, shrinking to SHRINK
const BLAZE_MS = 220;
const THROB_HZ = 9;
const TREMBLE = 7;
const STAMP_MS = 420;
const STAMP_EASE = 0.7;
const TOE_FLY_MS = 130;
const HOP = 50;
const SHRINK = 0.45;
// the pad winds back WIND px away from its button, swelling by SWELL, over
// the toes' stamping, then slams in over PAD_FLY_MS, PAD_AFTER_MS after the
// last toe lands
const WIND = 60;
const SWELL = 0.25;
const PAD_AFTER_MS = 70;
const PAD_FLY_MS = 140;
// landed, a part's glitter spills out over SPILL_MS to SPILL of its size; a
// toe flashes FLASH px over FLASH_MS, the pad blasts OWN_BLAST
const SPILL_MS = 200;
const SPILL = 1.8;
const FLASH = 120;
const FLASH_MS = 220;
const OWN_BLAST = 400;
const GLOW = 2.4;
// shakes by step: a spare toe, a button, its own
const SHAKES = [0.5, 1.1, 3];
const CLICK_SHAKE: [number, number] = [0.25, 0.6];

interface Part {
  // its middle in paw units scaled to px, local to the paw's
  cx: number;
  cy: number;
  bar: number;
  launchMs: number;
  landMs: number;
}
interface State {
  // the paw's middle off its own button and its size
  offX: number;
  offY: number;
  // every dot local to the paw's middle, its part, its landing and its bend
  xs: Float32Array;
  ys: Float32Array;
  part: Uint8Array;
  lands: Float32Array;
  bend: Float32Array;
  // part 0 the pad, then the toes; each part's transform this frame
  parts: Part[];
  dx: Float32Array;
  dy: Float32Array;
  scale: Float32Array;
  alpha: Float32Array;
  // when each part is drawn (a click), the paw drawn, the stamping
  done: Float32Array;
  drawnMs: number;
  stampMs: number;
  size: number;
}
const states = new WeakMap<Running, State>();
const paw: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
const GOLD_FLASH = fadeStops(COLOR.heavenlyGold);
const WHITE_FLASH = fadeStops(COLOR.white, 0.3);

// the pad: an oval narrowing to the top, three lobes along its bottom
const PAD_SHAPE: Shape = [
  Array.from({ length: 72 }, (_, k) => {
    const a = (k / 72) * Math.PI * 2;
    const s = Math.sin(a);
    return {
      x: Math.cos(a) * (1 - 0.3 * Math.max(0, -s)),
      y: s * 0.8 + 0.1 * Math.max(0, s) * Math.cos(3 * (a - Math.PI / 2)),
    };
  }),
];

// a toe bean: an oval, long along `angle`
const toeShape = (angle: number): Shape => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    Array.from({ length: 32 }, (_, k) => {
      const t = (k / 32) * Math.PI * 2;
      const u = Math.cos(t);
      const v = Math.sin(t) * 0.8;
      return { x: u * cos - v * sin, y: u * sin + v * cos };
    }),
  ];
};

// each tap also boosting every worker on the open floor with the most
// workers, as if each was tapped
const pawTaps = defineTapPerk("Paw", (t) => {
  let most: Floor | null = null;
  for (const floor of t.floors)
    if (floor.unlocked && (!most || floor.workerCount > most.workerCount))
      most = floor;
  if (!most) return;
  const now = Date.now();
  const count = getRenderedWorkerCount(most);
  for (let i = 0; i < count; i++) {
    clickWorker(most, i, now);
    activateBoosted(most, i, now);
  }
  if (count > 0) playBloop();
});

registerFloorCrit("pawPrintCrit", {
  reward(t) {
    pawTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    // the other buttons top to bottom, a toe each (at least TOES)
    const order = ownLast(bars);
    const others = order.slice(0, -1);
    const toes = Math.max(TOES, others.length);
    // fitted left of the column, centred down it
    let left = Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const bar of bars) {
      left = Math.min(left, bar.x - BTN_W / 2);
      top = Math.min(top, bar.y);
      bottom = Math.max(bottom, bar.y);
    }
    const room = left - GAP - (-r.viewportWidth / 2 + EDGE);
    const size = Math.max(MIN_PAW, Math.min(PAW, room / (2 * EXTENT)));
    const cx = left - GAP - size * EXTENT;
    const high = -r.viewportWidth * 0.5 + size * EXTENT;
    const low = r.viewportWidth * 0.85 - size * EXTENT;
    const cy =
      high < low
        ? Math.max(high, Math.min(low, (top + bottom) / 2))
        : (top + bottom) / 2;

    // the pad's dots, then each toe's left to right
    const xs: number[] = [];
    const ys: number[] = [];
    const part: number[] = [];
    const centres: Point[] = [{ x: 0, y: MID * size }];
    for (const p of shapeFill(PAD_SHAPE, PAD_DOTS, centres[0], PAD * size)) {
      xs.push(p.x);
      ys.push(p.y);
      part.push(0);
    }
    const step = (ANGLES[1] - ANGLES[0]) / (toes - 1);
    const toe = Math.min(TOE, ARC * Math.sin(step / 2) * 0.9);
    const toeDots = Math.max(MIN_TOE_DOTS, Math.round(TOE_DOTS / toes));
    for (let j = 0; j < toes; j++) {
      const a = ANGLES[0] + step * j;
      const c = {
        x: Math.cos(a) * ARC * size,
        y: (MID + Math.sin(a) * ARC) * size,
      };
      centres.push(c);
      for (const p of shapeFill(
        toeShape(a),
        toeDots,
        c,
        toe * TOE_LONG * size,
      )) {
        xs.push(p.x);
        ys.push(p.y);
        part.push(j + 1);
      }
    }
    const n = xs.length;
    const lands = new Float32Array(n);
    const bend = new Float32Array(n);
    const done = new Float32Array(toes + 1);
    for (let i = 0; i < n; i++) {
      lands[i] = IN_MS + FLY_MS + FILL_MS * (i / n) ** FILL_EASE;
      bend[i] = (holeHash(i, 4711) * 2 - 1) * SWIRL;
      done[part[i]] = lands[i];
    }
    const drawnMs = lands[n - 1];
    const stampMs = drawnMs + BLAZE_MS;

    // the toes right to left, into the buttons top to bottom; a spare toe
    // (more toes than buttons) pops into one already stamped, only jolting
    const parts: Part[] = [
      { cx: 0, cy: centres[0].y, bar: 0, launchMs: 0, landMs: 0 },
    ];
    for (let j = 1; j <= toes; j++)
      parts.push({
        cx: centres[j].x,
        cy: centres[j].y,
        bar: 0,
        launchMs: 0,
        landMs: 0,
      });
    let lastLand = stampMs;
    for (let k = 0; k < toes; k++) {
      const p = parts[toes - k];
      p.bar = others.length > 0 ? others[k % others.length] : 0;
      p.launchMs = stampMs + STAMP_MS * (k / toes) ** STAMP_EASE;
      p.landMs = p.launchMs + TOE_FLY_MS;
      lastLand = p.landMs;
      hit(p.bar, p.landMs, k < others.length ? 1 : 0);
    }
    parts[0].launchMs = lastLand + PAD_AFTER_MS;
    parts[0].landMs = parts[0].launchMs + PAD_FLY_MS;
    hit(0, parts[0].landMs, 2);

    states.set(r, {
      offX: cx - bars[0].x,
      offY: cy - bars[0].y,
      xs: Float32Array.from(xs),
      ys: Float32Array.from(ys),
      part: Uint8Array.from(part),
      lands,
      bend,
      parts,
      dx: new Float32Array(toes + 1),
      dy: new Float32Array(toes + 1),
      scale: new Float32Array(toes + 1),
      alpha: new Float32Array(toes + 1),
      done,
      drawnMs,
      stampMs,
      size,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { xs, ys, part, lands, bend, parts, dx, dy, scale, alpha, done } =
      state;
    const { drawnMs, stampMs, size } = state;
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
    // a click and a jolt as each part is drawn, rising
    while (r.kicked < done.length && ms >= done[r.kicked]) {
      const u = r.kicked / (done.length - 1);
      playSpinTick(1 + 0.8 * u);
      r.shake(lerp(CLICK_SHAKE[0], CLICK_SHAKE[1], u));
      r.kicked++;
    }
    paw.x = bars[0].x + state.offX;
    paw.y = bars[0].y + state.offY;
    const pad = parts[0];

    // each part's place this frame: blazing and trembling in the paw, the
    // pad winding back and swelling, flying into its button, spilling out
    const blaze = clamp01((ms - drawnMs) / BLAZE_MS);
    const throb =
      blaze > 0
        ? 0.5 + 0.5 * Math.sin((ms / 1000) * THROB_HZ * Math.PI * 2)
        : 0;
    const wind = clamp01((ms - stampMs) / (pad.launchMs - stampMs));
    for (let p = 0; p < parts.length; p++) {
      const it = parts[p];
      const end = bars[it.bar];
      const tx = end.x - BTN_W / 2 - paw.x;
      const ty = end.y - paw.y;
      if (ms < it.launchMs) {
        const charge = p === 0 ? Math.max(blaze, wind) : blaze;
        trembleAt(charge, ms, TREMBLE * (p === 0 ? 1 + wind : 1), shiver);
        dx[p] = shiver.x;
        dy[p] = shiver.y;
        scale[p] = 1 + 0.06 * throb;
        alpha[p] = 1;
        if (p === 0 && wind > 0) {
          // back away from its button
          const ax = it.cx - tx;
          const ay = it.cy - ty;
          const k = (WIND * wind * wind) / (Math.hypot(ax, ay) || 1);
          dx[p] += ax * k;
          dy[p] += ay * k;
          scale[p] *= 1 + SWELL * wind;
        }
      } else if (ms < it.landMs) {
        const u = ((ms - it.launchMs) / (it.landMs - it.launchMs)) ** 2;
        dx[p] = (tx - it.cx) * u;
        dy[p] = (ty - it.cy) * u - (p === 0 ? 0 : HOP * 4 * u * (1 - u));
        scale[p] = lerp(p === 0 ? 1 + SWELL : 1, SHRINK, u);
        alpha[p] = 1;
      } else {
        const since = ms - it.landMs;
        dx[p] = tx - it.cx;
        dy[p] = ty - it.cy;
        scale[p] = lerp(SHRINK, SPILL, since / SPILL_MS);
        alpha[p] = since < SPILL_MS ? 1 - since / SPILL_MS : 0;
      }
    }

    // the paw's glow gathering as it blazes, the pad's as it winds back
    if (blaze > 0 && ms < pad.launchMs) {
      at.x = paw.x;
      at.y = paw.y;
      drawChargeGlow(ctx, at, blaze * (1 - 0.6 * wind), size * GLOW, now);
      if (wind > 0) {
        at.x = paw.x + pad.cx + dx[0];
        at.y = paw.y + pad.cy + dy[0];
        drawChargeGlow(ctx, at, wind, size * PAD * 2.6, now);
      }
    }

    if (ms >= IN_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      // the number's place, local to the paw
      const fx = -paw.x;
      const fy = -paw.y;
      const dot = DOT * (1 + 0.6 * blaze);
      for (let i = 0; i < xs.length; i++) {
        const land = lands[i];
        if (ms < land - FLY_MS) break;
        const x = xs[i];
        const y = ys[i];
        if (ms < land) {
          // streaming out of the number on a bend
          const u = 1 - (land - ms) / FLY_MS;
          const b = bend[i];
          const cx = (fx + x) / 2 - (y - fy) * b;
          const cy = (fy + y) / 2 + (x - fx) * b;
          const v = 1 - u;
          ctx.globalAlpha = 1;
          stampGlimmer(
            ctx,
            paw.x + v * v * fx + 2 * v * u * cx + u * u * x,
            paw.y + v * v * fy + 2 * v * u * cy + u * u * y,
            DOT * 0.8,
            i,
            COLOR.heavenlyGold,
          );
          continue;
        }
        const p = part[i];
        const a = alpha[p];
        if (a <= 0) continue;
        const it = parts[p];
        const s = scale[p];
        ctx.globalAlpha = a;
        stampGlimmer(
          ctx,
          paw.x + it.cx + (x - it.cx) * s + dx[p],
          paw.y + it.cy + (y - it.cy) * s + dy[p],
          dot,
          i + ms * 0.004,
          blaze > 0.5 || i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
        );
      }
      // a pop of light as each toe lands
      for (let p = 1; p < parts.length; p++) {
        const since = ms - parts[p].landMs;
        if (since < 0 || since >= FLASH_MS) continue;
        const f = since / FLASH_MS;
        const end = bars[parts[p].bar];
        at.x = end.x - BTN_W / 2;
        at.y = end.y;
        ctx.globalAlpha = 1 - f;
        drawGlow(ctx, GOLD_FLASH, at.x, at.y, FLASH * (0.6 + 0.9 * f));
        drawGlow(ctx, WHITE_FLASH, at.x, at.y, FLASH * 0.45 * (1 - 0.5 * f));
      }
      endLightBatch(ctx);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }

    at.x = bars[0].x - BTN_W / 2;
    at.y = bars[0].y;
    drawDetonation(ctx, at, ms - pad.landMs, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
