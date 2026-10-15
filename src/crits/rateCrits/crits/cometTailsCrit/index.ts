// Comet Tails, a rate crit: the number shrinks into a spark beside the
// readouts and a tilted disk of stars spins up round it, rumbling; the stars
// clump, a trickle turning into a flood, into one comet per bar, each on its
// own long orbit whipping ever closer round the core and ever faster, its
// tail streaming out behind; one by one, quicker and quicker, each comet is
// flung off along its heading onto its bar's readout (a flash, the readout
// turning over); the core flares and the last comet slams into its own in
// the big blast. Each bar shoots off fast, slowing a step every payout
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { COLOR } from "../../../../palette";
import {
  planDisk,
  scatterDisk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import { drawChargeGlow } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
const IN_MS = 140;
const GROW_MS = 260;
// the disk: STARS from INNER to OUTER px round, seen SQUASH tall and turned
// TILT off level, centred BACK of a bar's half width left of the bars (kept
// EDGE of its size on screen)
const STARS = 260;
const INNER = 22;
const OUTER = 150;
const SQUASH = 0.38;
const TILT = -0.22;
const RIM_HZ = 0.45;
const BACK = 0.2;
const EDGE = 0.75;
const STAR = 14;
// its clock spinning up: SPIN_UP sets how fast it quickens
const SPIN_UP = 6e-7;
// the readouts READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
// the stars clumping onto the comets from CLUMP_FROM, the last CLUMP_SPAN on
// (a star's time share is its count share to PACE: a trickle, then a flood),
// each over DRIFT_MS
const CLUMP_FROM = IN_MS + GROW_MS;
const CLUMP_SPAN = 520;
const PACE = 0.55;
const DRIFT_MS = 200;
// the comets' orbits: RADIUS of the disk's rim, their eccentricity rising
// over ECC as they whip in closer to the core
const RADIUS: [number, number] = [0.5, 0.85];
const ECC: [number, number] = [0.15, 0.75];
const COMET = WISP_SIZE * 0.9;
const COMET_GROW = 0.9;
// the flings from FLING_FROM, GAP_MS apart (quickening), all in FLING_SPAN;
// each leaving REACH px along its heading before it bends onto its readout,
// landing FLY_MS later (its own OWN_FLY_MS)
const FLING_FROM = CLUMP_FROM + CLUMP_SPAN + DRIFT_MS + 30;
const GAP_MS: [number, number] = [150, 60];
const FLING_SPAN = 420;
const REACH = 110;
const FLY_MS = 170;
const OWN_FLY_MS = 190;
// the core: its charge, its flare at the last fling
const CORE_GLOW = 220;
const CORE_TREMBLE = 6;
const FLARE = 260;
const FLARE_MS = 260;
const CORE_BLAST = 180;
const OWN_BLAST = 360;
// a readout hit
const HIT_FLASH = 130;
const HIT_FLASH_MS = 170;
// rumble kicks RUMBLE_GAP_MS apart (closing), RUMBLE strong, then the flare's
const RUMBLE_GAP_MS: [number, number] = [140, 45];
const RUMBLE: [number, number] = [0.2, 1];
const FLARE_SHAKE = 2.2;
// shakes by step: unused, a readout hit, its own
const SHAKES = [0.4, 1, 3];

interface State {
  bars: Point[];
  half: number;
  viewportWidth: number;
  center: Point;
  stars: Orbit[];
  starComet: Int16Array;
  joinMs: Float32Array;
  // per comet: its bar, orbit, fling and landing
  bar: Int16Array;
  radius: Float32Array;
  phase: Float32Array;
  peri: Float32Array;
  release: Float32Array;
  land: Float32Array;
  relX: Float32Array;
  relY: Float32Array;
  dirX: Float32Array;
  dirY: Float32Array;
  at: ((ms: number) => Point | null)[];
  // where each comet is this frame (shown: 1)
  cx: Float32Array;
  cy: Float32Array;
  shown: Uint8Array;
  climaxMs: number;
  rumbleMs: Float32Array;
  rumble: Float32Array;
}
const states = new WeakMap<Running, State>();
const DISK = planDisk(
  { x: 0, y: 0 },
  { inner: INNER, outer: OUTER, squash: SQUASH, tilt: TILT, rimHz: RIM_HZ },
);
const TILT_COS = Math.cos(TILT);
const TILT_SIN = Math.sin(TILT);
const FLARE_STOPS = fadeStops(COLOR.white);
const star: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };
const p0: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };

// the disk's clock: ms at first, quickening
function spinClock(ms: number): number {
  const d = Math.max(0, ms - IN_MS);
  return ms + SPIN_UP * d * d * d;
}

function growAt(ms: number): number {
  const g = clamp01((ms - IN_MS) / GROW_MS);
  return g * (2 - g);
}

function readoutOf(s: State, b: number, into: Point): Point {
  into.x = s.bars[b].x + s.half * READOUT;
  into.y = s.bars[b].y + CONTACT_Y;
  return into;
}

// comet k's offset off the core at ms: a Kepler ellipse with the core at its
// focus, closing in as its eccentricity rises
function orbitOffset(s: State, k: number, ms: number, into: Point): Point {
  const e = lerp(
    ECC[0],
    ECC[1],
    clamp01((ms - CLUMP_FROM) / (s.climaxMs - CLUMP_FROM)),
  );
  const r = s.radius[k];
  const m = s.phase[k] + DISK.omega(r) * spinClock(ms);
  let E = m;
  for (let j = 0; j < 3; j++)
    E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  const ox = r * (Math.cos(E) - e);
  const oy = r * Math.sqrt(1 - e * e) * Math.sin(E);
  const pc = Math.cos(s.peri[k]);
  const ps = Math.sin(s.peri[k]);
  const grow = growAt(ms);
  const x = (ox * pc - oy * ps) * grow;
  const y = (ox * ps + oy * pc) * SQUASH * grow;
  into.x = x * TILT_COS - y * TILT_SIN;
  into.y = x * TILT_SIN + y * TILT_COS;
  return into;
}

// comet k at ms: round the core, then flung off along its heading and bent
// onto its readout, snapping on faster and faster
function cometAt(s: State, k: number, ms: number, into: Point): Point | null {
  const b = s.bar[k];
  if (ms < CLUMP_FROM || ms > s.land[k] || b >= s.bars.length) return null;
  if (ms <= s.release[k]) {
    orbitOffset(s, k, ms, into);
    into.x += s.center.x;
    into.y += s.center.y;
    return into;
  }
  const v = (ms - s.release[k]) / (s.land[k] - s.release[k]);
  const u = v * (0.55 + 0.45 * v);
  p0.x = s.center.x + s.relX[k];
  p0.y = s.center.y + s.relY[k];
  const c1x = p0.x + s.dirX[k] * REACH;
  const c1y = p0.y + s.dirY[k] * REACH;
  readoutOf(s, b, spot);
  const w = 1 - u;
  into.x = w * w * p0.x + 2 * w * u * c1x + u * u * spot.x;
  into.y = w * w * p0.y + 2 * w * u * c1y + u * u * spot.y;
  return into;
}

// the disk beside the readouts, halfway down the bars in view
function placeCenter(s: State): void {
  const { bars } = s;
  let top = bars[0].y;
  let bottom = top;
  for (let b = 1; b < bars.length; b++) {
    if (bars[b].y < top) top = bars[b].y;
    if (bars[b].y > bottom) bottom = bars[b].y;
  }
  s.center.x = Math.max(
    -s.viewportWidth / 2 + OUTER * EDGE,
    bars[0].x - s.half * BACK,
  );
  s.center.y = (top + bottom) / 2;
}

// a comet's tail: the bar runs `speed` times as fast, a step slower every
// payout
const tails = defineBarEffect<{ left: number; of: number }>({
  speed: (v) => 1 + (meta.values.speed - 1) * (v.left / v.of),
  onPayout: (v) => {
    if (v.left <= 1) return undefined;
    v.left--;
    return v;
  },
});

registerFloorCrit("cometTailsCrit", {
  reward(t) {
    const { speed, payouts, ownPayouts } = meta.values;
    t.flipRate();
    const of = t.own ? ownPayouts : payouts;
    tails.set(t.floor, { left: of, of });
    t.punch(`x${speed} Comet Tail`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const n = order.length;
    const bar = Int16Array.from(order);
    const radius = new Float32Array(n);
    const phase = new Float32Array(n);
    const peri = new Float32Array(n);
    const release = new Float32Array(n);
    const land = new Float32Array(n);
    let total = 0;
    for (let k = 0; k < n; k++)
      total += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, n - 1));
    const scale = Math.min(1, FLING_SPAN / total);
    let at = FLING_FROM;
    for (let k = 0; k < n; k++) {
      radius[k] = OUTER * lerp(RADIUS[0], RADIUS[1], holeHash(k, 6104));
      phase[k] = holeHash(k, 6101) * TAU;
      peri[k] = (k / n) * TAU + holeHash(k, 6102);
      if (k > 0)
        at += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, n - 1)) * scale;
      release[k] = at;
      land[k] = at + (bar[k] === 0 ? OWN_FLY_MS : FLY_MS);
      hit(bar[k], land[k], bar[k] === 0 ? 2 : 1);
    }
    const climaxMs = release[n - 1];
    // stars spread over the disk, each clumping onto a comet
    const stars = scatterDisk(DISK, STARS);
    const starComet = new Int16Array(STARS);
    const joinMs = new Float32Array(STARS);
    for (let i = 0; i < STARS; i++) {
      starComet[i] = i % n;
      joinMs[i] = CLUMP_FROM + CLUMP_SPAN * holeHash(i, 6103) ** PACE;
    }
    // the rumble, closing up as it spins up
    const kicks: number[] = [];
    for (let k = IN_MS + 60; k < climaxMs; ) {
      kicks.push(k);
      k += lerp(RUMBLE_GAP_MS[0], RUMBLE_GAP_MS[1], (k - IN_MS) / (climaxMs - IN_MS));
    }
    const rumbleMs = new Float32Array(kicks.length + 1);
    const rumble = new Float32Array(kicks.length + 1);
    for (let k = 0; k < kicks.length; k++) {
      rumbleMs[k] = kicks[k];
      rumble[k] = lerp(RUMBLE[0], RUMBLE[1], (kicks[k] - IN_MS) / (climaxMs - IN_MS));
    }
    rumbleMs[kicks.length] = climaxMs;
    rumble[kicks.length] = FLARE_SHAKE;
    const state: State = {
      bars,
      half: r.play.barHalfWidth,
      viewportWidth: r.viewportWidth,
      center: { x: 0, y: 0 },
      stars,
      starComet,
      joinMs,
      bar,
      radius,
      phase,
      peri,
      release,
      land,
      relX: new Float32Array(n),
      relY: new Float32Array(n),
      dirX: new Float32Array(n),
      dirY: new Float32Array(n),
      at: [],
      cx: new Float32Array(n),
      cy: new Float32Array(n),
      shown: new Uint8Array(n),
      climaxMs,
      rumbleMs,
      rumble,
    };
    // where each is flung from and the way it's heading then
    for (let k = 0; k < n; k++) {
      orbitOffset(state, k, release[k], spot);
      orbitOffset(state, k, release[k] - 6, star);
      state.relX[k] = spot.x;
      state.relY[k] = spot.y;
      const dx = spot.x - star.x;
      const dy = spot.y - star.y;
      const len = Math.hypot(dx, dy) || 1;
      state.dirX[k] = dx / len;
      state.dirY[k] = dy / len;
      const into: Point = { x: 0, y: 0 };
      state.at.push((ms) => cometAt(state, k, ms, into));
    }
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || bars.length === 0) return;
    s.bars = bars;
    s.viewportWidth = r.viewportWidth;
    placeCenter(s);
    const now = r.startedAt + ms;
    const { center, climaxMs } = s;
    const n = s.bar.length;
    while (r.kicked < s.rumbleMs.length && ms >= s.rumbleMs[r.kicked]) {
      r.shake(s.rumble[r.kicked]);
      r.kicked++;
    }
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, center.x, p),
        lerp(0, center.y, p),
        r.flashFont * lerp(1, 0.25, p),
      );
      return;
    }

    // the core charging, trembling harder as it fills
    const charge = clamp01((ms - IN_MS) / (climaxMs - IN_MS));
    if (ms < climaxMs) {
      const c = charge * charge;
      core.x = center.x + Math.sin(ms * 0.13) * CORE_TREMBLE * c;
      core.y = center.y + Math.cos(ms * 0.17) * CORE_TREMBLE * 0.5 * c;
      drawChargeGlow(ctx, core, 0.25 + 0.75 * c, CORE_GLOW, now);
    }

    // where every comet is this frame, for the stars clumping onto them
    for (let k = 0; k < n; k++) {
      const c = cometAt(s, k, ms, head);
      s.shown[k] = c ? 1 : 0;
      if (!c) continue;
      s.cx[k] = c.x;
      s.cy[k] = c.y;
    }

    // the disk, spinning up, its stars clumping onto the comets
    const T = spinClock(ms);
    const grow = growAt(ms);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    const { stars, joinMs, starComet } = s;
    for (let i = 0; i < stars.length; i++) {
      const u = (ms - joinMs[i]) / DRIFT_MS;
      if (u >= 1) continue;
      DISK.at(stars[i], T, star, grow);
      let x = center.x + star.x;
      let y = center.y + star.y;
      const k = starComet[i];
      if (u > 0 && s.shown[k]) {
        const e = u * u;
        x += (s.cx[k] - x) * e;
        y += (s.cy[k] - y) * e;
      }
      stampGlimmer(
        ctx,
        x,
        y,
        STAR * (1 - 0.35 * Math.max(0, u)),
        i,
        i % 2 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    // a flash on each readout as its comet hits
    for (let k = 0; k < n; k++) {
      const b = s.bar[k];
      const since = ms - s.land[k];
      if (b === 0 || b >= bars.length || since < 0 || since >= HIT_FLASH_MS)
        continue;
      readoutOf(s, b, spot);
      const p = 1 - since / HIT_FLASH_MS;
      stampGlimmer(ctx, spot.x, spot.y, HIT_FLASH * p, k + 400, COLOR.white);
      stampGlimmer(ctx, spot.x, spot.y, HIT_FLASH * 1.4 * p, k + 450, COLOR.heavenlyGold);
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    // the comets, swelling as they swallow their stars
    const fed = clamp01((ms - CLUMP_FROM) / (CLUMP_SPAN + DRIFT_MS)) ** (1 / PACE);
    for (let k = 0; k < n; k++) {
      const own = s.bar[k] === 0;
      drawWispBetween(
        ctx,
        s.at[k],
        ms,
        now,
        COMET * (0.45 + COMET_GROW * fed) * (own ? 1.35 : 1),
        fed,
        CLUMP_FROM,
        s.land[k],
      );
    }

    // the core's flare at the last fling
    const flared = ms - climaxMs;
    if (flared >= 0 && flared < FLARE_MS) {
      const p = flared / FLARE_MS;
      const alpha = ctx.globalAlpha;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (1 - p) * (1 - p);
      drawGlow(ctx, FLARE_STOPS, center.x, center.y, FLARE * (0.6 + 0.8 * p));
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, center, flared, CORE_BLAST, now);
    if (s.bar[n - 1] < bars.length) {
      readoutOf(s, s.bar[n - 1], spot);
      drawDetonation(ctx, spot, ms - s.land[n - 1], OWN_BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
