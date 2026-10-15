// Firenado, a rate crit: the number shrinks into a spark beside the bars and
// a funnel of fire and gold glitter touches down there, small and lazy,
// rumbling as it grows taller and spins up; its foot tears off along the
// readouts, across the building and back to its own, each leg quicker, every
// readout's sparks ripped off with a flash and spun up the flames as its rate
// turns over; at its own it whips round flat out, trembling, and flings
// everything out in one burst, raining back onto every readout at once in a
// hard shake and the big blast. Each bar's payouts flare up, then burn down
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  drawTornado,
  flingFrom,
  funnelAt,
  liftAt,
  planTornado,
  tornadoGrow,
  tornadoTurn,
  type Tornado,
} from "../../../../shared/animationStyles/tornado";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// touching down GAP px left of the bars (EDGE px on screen), growing over
// SPIN_MS before its foot sets off
const GAP = 80;
const EDGE = 90;
const SPIN_MS = 380;
const SWEEP_FROM = IN_MS + SPIN_MS;
// a readout READOUT of a bar's half width out, CONTACT_Y off its middle; the
// foot FOOT_DY under it
const READOUT = 0.6;
const CONTACT_Y = -20;
const FOOT_DY = 12;
// each leg LEG_MS (quickening), all of them squeezed into SWEEP_SPAN
const LEG_MS: [number, number] = [240, 110];
const SWEEP_SPAN = 820;
// the whip at its own, then everything flung out over FLING_MS
const WHIP_MS = 220;
const TREMBLE = 10;
const FLING_MS = 260;
const COLLAPSE_MS = 200;
// the funnel, taller and wider as it spins up
const HEIGHT: [number, number] = [150, 380];
const TOP: [number, number] = [60, 170];
const FOOT = 22;
const SPIN_HZ: [number, number] = [0.6, 4];
// the fire: FLAMES tongues up the funnel, EMBERS rising off it
const FLAMES = 12;
const FLAME = 26;
const EMBERS = 28;
const EMBER = 16;
const EMBER_MS: [number, number] = [380, 620];
const HEAT = 90;
// the sparks: CATCH round each readout, SPREAD px across, caught STAGGER_MS
// apart; landing SPLASH px round a readout
const CATCH = 12;
const SPREAD = 46;
const STAGGER_MS = 7;
const SPECK = 20;
const SPLASH = 34;
// flashes: a readout caught, every readout landed on
const CATCH_FLASH = 120;
const CATCH_FLASH_MS = 140;
const LAND_FLASH = 150;
const LAND_FLASH_MS = 180;
const FIRE_BLAST = 300;
const OWN_BLAST = 380;
// rumble kicks from RUMBLE_GAP_MS apart (closing), RUMBLE strong, then the
// fling's CLIMAX_SHAKE
const RUMBLE_GAP_MS: [number, number] = [130, 45];
const RUMBLE: [number, number] = [0.25, 1.1];
const CLIMAX_SHAKE = 2.2;
// shakes by step: the burst landing, a readout caught, its own caught
const SHAKES = [3, 0.9, 1.6];

const GOLD = COLOR.heavenlyGold;
const WHITE = COLOR.white;
const EMBER_COLORS = [COLOR.orange, COLOR.red, GOLD];
const FIRE_STOPS = [
  fadeStops(COLOR.red),
  fadeStops(COLOR.orange),
  fadeStops(COLOR.amber),
];
const HEAT_STOPS = fadeStops(COLOR.orange);

interface State {
  bars: Point[];
  half: number;
  viewportWidth: number;
  tornado: Tornado;
  // the legs in turn: the bar each ends on and when
  legBar: Int16Array;
  legEnd: Float32Array;
  sweepEnd: number;
  climaxMs: number;
  landMs: number;
  // the sparks: their bar, offset off its readout, when caught, where they
  // land
  sBar: Int16Array;
  sOx: Float32Array;
  sOy: Float32Array;
  sCaught: Float32Array;
  sSeed: Float32Array;
  sTo: Int16Array;
  sTx: Float32Array;
  sTy: Float32Array;
  rumbleMs: Float32Array;
  rumble: Float32Array;
}
const states = new WeakMap<Running, State>();
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const foot: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };

function readoutOf(s: State, b: number, into: Point): Point {
  into.x = s.bars[b].x + s.half * READOUT;
  into.y = s.bars[b].y + CONTACT_Y;
  return into;
}

// where it touches down, beside the first bar it sets off for
function besideOf(s: State, into: Point): Point {
  into.x = Math.max(
    -s.viewportWidth / 2 + EDGE,
    s.bars[0].x - s.half - GAP,
  );
  into.y = s.bars[s.legBar[0]].y + CONTACT_Y + FOOT_DY;
  return into;
}

// its foot at ms: beside the bars, racing leg by leg over the readouts, then
// trembling on its own
function footAt(s: State, ms: number, into: Point): Point {
  if (ms <= SWEEP_FROM) return besideOf(s, into);
  for (let k = 0; k < s.legEnd.length; k++) {
    if (ms >= s.legEnd[k]) continue;
    const start = k > 0 ? s.legEnd[k - 1] : SWEEP_FROM;
    if (k > 0) {
      readoutOf(s, s.legBar[k - 1], from);
      from.y += FOOT_DY;
    } else besideOf(s, from);
    readoutOf(s, s.legBar[k], to);
    const u = (ms - start) / (s.legEnd[k] - start);
    into.x = lerp(from.x, to.x, u);
    into.y = lerp(from.y, to.y + FOOT_DY, u);
    return into;
  }
  readoutOf(s, 0, into);
  const w = clamp01((ms - s.sweepEnd) / WHIP_MS);
  into.x += Math.sin(ms * 0.11) * TREMBLE * w;
  into.y += FOOT_DY + Math.cos(ms * 0.13) * TREMBLE * 0.5 * w;
  return into;
}

// payouts flaring from x`start` up to x`peak`, then burning down to x1
interface Flare {
  from: number;
  until: number;
}
function flareAt(v: Flare, now: number): number {
  const { start, peak, rise } = meta.values;
  const u = clamp01((now - v.from) / (v.until - v.from));
  if (u < rise) return lerp(start, peak, Math.sin((u / rise) * Math.PI / 2));
  const d = (u - rise) / (1 - rise);
  return lerp(peak, 1, d * d * (3 - 2 * d));
}
const flares = defineBarEffect<Flare>({
  payout: (v, now) => flareAt(v, now),
  ended: (v, now) => now >= v.until,
});

registerFloorCrit("firenadoCrit", {
  reward(t) {
    t.flipRate();
    flares.set(t.floor, {
      from: t.now,
      until: t.now + (t.own ? meta.values.ownMs : meta.values.ms),
    });
    t.punch(`x${meta.values.peak} Flare-up`);
  },
  plan(r, bars, hit) {
    const n = bars.length;
    // across the building towards its own end, then back onto its own
    const others: number[] = [];
    for (let b = 1; b < n; b++) others.push(b);
    others.sort((a, b) => bars[a].y - bars[b].y);
    if (others.length > 0) {
      const top = bars[others[0]].y;
      const bottom = bars[others[others.length - 1]].y;
      if (Math.abs(bars[0].y - top) < Math.abs(bars[0].y - bottom))
        others.reverse();
    }
    others.push(0);
    const legBar = Int16Array.from(others);
    const legEnd = new Float32Array(n);
    let total = 0;
    for (let k = 0; k < n; k++)
      total += lerp(LEG_MS[0], LEG_MS[1], k / Math.max(1, n - 1));
    const scale = Math.min(1, SWEEP_SPAN / total);
    let at = SWEEP_FROM;
    for (let k = 0; k < n; k++) {
      at += lerp(LEG_MS[0], LEG_MS[1], k / Math.max(1, n - 1)) * scale;
      legEnd[k] = at;
      hit(legBar[k], at, legBar[k] === 0 ? 2 : 1);
    }
    const sweepEnd = at;
    const climaxMs = sweepEnd + WHIP_MS;
    const landMs = climaxMs + FLING_MS;
    hit(0, landMs, 0);
    // the sparks round every readout, caught as the foot gets there, flung
    // out onto readouts all down the building
    const m = n * CATCH;
    const sBar = new Int16Array(m);
    const sOx = new Float32Array(m);
    const sOy = new Float32Array(m);
    const sCaught = new Float32Array(m);
    const sSeed = new Float32Array(m);
    const sTo = new Int16Array(m);
    const sTx = new Float32Array(m);
    const sTy = new Float32Array(m);
    for (let k = 0; k < n; k++)
      for (let j = 0; j < CATCH; j++) {
        const i = k * CATCH + j;
        sBar[i] = legBar[k];
        sOx[i] = (holeHash(i, 5101) * 2 - 1) * SPREAD;
        sOy[i] = (holeHash(i, 5102) * 2 - 1) * SPREAD * 0.4;
        sCaught[i] = legEnd[k] + j * STAGGER_MS;
        sSeed[i] = holeHash(i, 5103);
        sTo[i] = (i * 7) % n;
        sTx[i] = (holeHash(i, 5104) * 2 - 1) * SPLASH;
        sTy[i] = (holeHash(i, 5105) * 2 - 1) * SPLASH * 0.4;
      }
    // the rumble, closing up as it spins up
    const kicks: number[] = [];
    for (let k = IN_MS + 60; k < climaxMs; ) {
      kicks.push(k);
      const u = (k - IN_MS) / (climaxMs - IN_MS);
      k += lerp(RUMBLE_GAP_MS[0], RUMBLE_GAP_MS[1], u);
    }
    const rumbleMs = new Float32Array(kicks.length + 1);
    const rumble = new Float32Array(kicks.length + 1);
    for (let k = 0; k < kicks.length; k++) {
      rumbleMs[k] = kicks[k];
      rumble[k] = lerp(RUMBLE[0], RUMBLE[1], (kicks[k] - IN_MS) / (climaxMs - IN_MS));
    }
    rumbleMs[kicks.length] = climaxMs;
    rumble[kicks.length] = CLIMAX_SHAKE;
    const state: State = {
      bars,
      half: r.play.barHalfWidth,
      viewportWidth: r.viewportWidth,
      tornado: planTornado((ms, into) => footAt(state, ms, into), {
        startMs: IN_MS,
        endMs: climaxMs,
        height: HEIGHT[0],
        foot: FOOT,
        top: TOP[0],
        spinHz: SPIN_HZ,
        sway: 40,
        growMs: SPIN_MS,
      }),
      legBar,
      legEnd,
      sweepEnd,
      climaxMs,
      landMs,
      sBar,
      sOx,
      sOy,
      sCaught,
      sSeed,
      sTo,
      sTx,
      sTy,
      rumbleMs,
      rumble,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || bars.length === 0) return;
    s.bars = bars;
    s.viewportWidth = r.viewportWidth;
    const n = bars.length;
    const now = r.startedAt + ms;
    const t = s.tornado;
    const { climaxMs, landMs } = s;
    while (r.kicked < s.rumbleMs.length && ms >= s.rumbleMs[r.kicked]) {
      r.shake(s.rumble[r.kicked]);
      r.kicked++;
    }
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      besideOf(s, foot);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, foot.x, p),
        lerp(0, foot.y, p),
        r.flashFont * lerp(1, 0.25, p),
      );
    }
    // taller and wider as it spins up, frozen at the fling
    const funnelMs = Math.min(ms, climaxMs);
    const grown = clamp01((funnelMs - IN_MS) / (climaxMs - IN_MS));
    t.height = lerp(HEIGHT[0], HEIGHT[1], grown);
    t.top = lerp(TOP[0], TOP[1], grown);
    const fade = 1 - clamp01((ms - climaxMs) / COLLAPSE_MS);
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;

    if (ms >= IN_MS && fade > 0) {
      // the fire: heat round its foot, flame tongues licking up the funnel
      const grow = tornadoGrow(t, funnelMs);
      const turn = tornadoTurn(t, funnelMs);
      ctx.globalCompositeOperation = "lighter";
      t.at(funnelMs, foot);
      ctx.globalAlpha = alpha * fade * (0.5 + 0.4 * grown);
      drawGlow(ctx, HEAT_STOPS, foot.x, foot.y, HEAT * grow * (1 + grown));
      for (let j = 0; j < FLAMES; j++) {
        const h = (j + 0.5) / FLAMES;
        const a = turn * (1.6 - 0.6 * h) + j * 2.399;
        funnelAt(t, funnelMs, h, a, spot);
        const near = 0.5 + 0.5 * Math.sin(a);
        const radius = (t.foot + (t.top - t.foot) * h ** 1.6) * grow;
        const flicker = 0.8 + 0.3 * Math.sin(ms * 0.031 + j * 1.7);
        ctx.globalAlpha = alpha * fade * 0.55 * (0.4 + 0.6 * near);
        drawGlow(
          ctx,
          FIRE_STOPS[j % 3],
          spot.x,
          spot.y,
          (radius * 1.1 + FLAME) * flicker,
        );
      }
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
      drawTornado(ctx, t, funnelMs, fade);
      // embers streaming up and off it
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let e = 0; e < EMBERS; e++) {
        const period = lerp(EMBER_MS[0], EMBER_MS[1], holeHash(e, 5106));
        const phase = ((ms + holeHash(e, 5107) * period) % period) / period;
        const a = turn * 1.3 + e * 2.1;
        funnelAt(t, funnelMs, Math.min(1, phase * 1.05), a, spot);
        ctx.globalAlpha = alpha * fade * (1 - phase);
        stampGlimmer(
          ctx,
          spot.x + Math.cos(a) * phase * 40 * grow,
          spot.y - phase * 30,
          EMBER * (1 - phase) * grow + 4,
          e + 300,
          EMBER_COLORS[e % 3],
        );
      }
      ctx.globalAlpha = alpha;
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }

    // the sparks: glowing on their readouts, spun up the funnel, flung out
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms >= IN_MS && ms < landMs)
      for (let i = 0; i < s.sBar.length; i++) {
        const b = s.sBar[i];
        if (b >= n) continue;
        const color = i % 3 ? GOLD : i % 2 ? WHITE : COLOR.orange;
        if (ms < s.sCaught[i]) {
          readoutOf(s, b, spot);
          stampGlimmer(
            ctx,
            spot.x + s.sOx[i] + Math.sin(ms * 0.04 + i) * 3,
            spot.y + s.sOy[i] + Math.cos(ms * 0.05 + i * 1.3) * 3,
            SPECK * 0.8,
            i,
            color,
          );
          continue;
        }
        if (ms < climaxMs) {
          liftAt(t, ms, s.sCaught[i], s.sSeed[i], spot);
          stampGlimmer(ctx, spot.x, spot.y, SPECK, i, color);
          continue;
        }
        const target = s.sTo[i] < n ? s.sTo[i] : 0;
        readoutOf(s, target, to);
        to.x += s.sTx[i];
        to.y += s.sTy[i];
        const u = (ms - climaxMs) / FLING_MS;
        flingFrom(t, climaxMs, s.sCaught[i], s.sSeed[i], to, u, spot);
        stampGlimmer(ctx, spot.x, spot.y, SPECK * (1.3 - 0.3 * u), i, color);
      }
    // a flash on every readout as the foot catches it, then as the burst
    // lands on all of them
    for (let k = 0; k < s.legBar.length; k++) {
      const b = s.legBar[k];
      const since = ms - s.legEnd[k];
      if (b >= n || since < 0 || since >= CATCH_FLASH_MS) continue;
      readoutOf(s, b, spot);
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        CATCH_FLASH * (1 - since / CATCH_FLASH_MS),
        k + 100,
        WHITE,
      );
    }
    const landed = ms - landMs;
    if (landed >= 0 && landed < LAND_FLASH_MS)
      for (let b = 1; b < n; b++) {
        readoutOf(s, b, spot);
        const p = 1 - landed / LAND_FLASH_MS;
        stampGlimmer(ctx, spot.x, spot.y, LAND_FLASH * p, b + 200, WHITE);
        stampGlimmer(ctx, spot.x, spot.y, LAND_FLASH * 1.4 * p, b + 250, GOLD);
      }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    // the fling: a blast of fire up the funnel, then its own readout's
    funnelAt(t, climaxMs, 0.45, 0, blast);
    drawDetonation(ctx, blast, ms - climaxMs, FIRE_BLAST, now);
    readoutOf(s, 0, spot);
    drawDetonation(ctx, spot, landed, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
