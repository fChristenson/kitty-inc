// Snow Devil, a button crit: an icy funnel of whirling snowflakes and frost
// glitter touches down just left of the bottom button and climbs the column,
// growing and spinning faster; as its foot passes each button it frosts its
// edge in a burst of crystals (a flash and a jolt, quicker each) and rips its
// sparkle up into the spin; at the top it whips round in tight loops,
// swelling and trembling with a rising rumble, then dives back down beside
// its own button and bursts, flinging the whole funnel onto it as a blizzard
// in the big blast: each of their next taps also levels the top open floor
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed } from "../../../../gameState";
import {
  flingFrom,
  funnelAt,
  liftAt,
  planTornado,
  tornadoGrow,
  tornadoTurn,
  type Tornado,
} from "../../../../shared/animationStyles/tornado";
import {
  chargeAt,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  beginLightBatch,
  endLightBatch,
  queueTurnedLight,
} from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { easeOut, quicken, quickenAt } from "../../../../shared/easing";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  byHeight,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
const IN_MS = 120;
// the foot GAP px left of the buttons' left ends, climbing from LEAD px under
// the bottom button to LEAD px over the top one over CLIMB_MS, accelerating
const GAP = 205;
const LEAD = 60;
const CLIMB_MS = 820;
// at the top it whips round WHIP_LAPS loops WHIP_R px across over WHIP_MS
// (its rumble rising from CHARGE_LEAD_MS before), then dives over DIVE_MS to
// beside its own button, DIVE_IN of the gap closer, trembling TREMBLE px
const WHIP_MS = 260;
const WHIP_LAPS = 2;
const WHIP_R = 44;
const DIVE_MS = 170;
const DIVE_IN = 0.45;
const CHARGE_LEAD_MS = 220;
const TREMBLE = 12;
// the funnel, swelling to WHIP_* as it whips round
const HEIGHT = 220;
const WHIP_HEIGHT = 480;
const FOOT = 18;
const TOP = 64;
const WHIP_TOP = 160;
const SWAY = 20;
const GROW_MS = 500;
const SPIN_HZ: [number, number] = [1.4, 8];
// its RINGS of PER_RING specks (every FLAKE_EVERY a snowflake), the low rings
// LOW_SPIN times as fast, wound TWIST rad up; SPRAY specks of snow kicked
// round its foot
const RINGS = 12;
const PER_RING = 8;
const FLAKE_EVERY = 3;
const LOW_SPIN = 1.8;
const TWIST = 3;
const FLARE = 1.6;
const SPECK = 0.12;
const SPRAY = 12;
// CATCH specks ripped off each button as it's passed, OWN_CATCH off its own,
// off its end over TEAR_MS, TEAR_STAGGER_MS apart
const CATCH = 18;
const OWN_CATCH = 30;
const TEAR_MS = 100;
const TEAR_STAGGER_MS = 3;
const SPECK_SIZE = 16;
const FLAKE_SIZE = 20;
// the funnel bursting into BLIZZARD more flakes at the climax, everything
// flung onto its own button's end FLING_MS in
const BLIZZARD = 60;
const FLING_MS = 170;
// a button frosted: a flash, crystals popping on its edge and FROST_FLAKES
// bursting off it out to FROST_REACH px, FROST_MS long
const FROST_MS = 320;
const FROST_GLOW = 110;
const FROST_FLAKES = 6;
const FROST_REACH = 46;
const EDGE_FLAKE = 20;
const OWN_FROST = 1.8;
// the burst at its foot as it bursts, and the blast on its own
const WHIP_BLAST = 240;
const OWN_BLAST = 440;
// shakes by step: its own passed, a button frosted, its own landed on
const SHAKES = [0.8, 1.4, 3.2];
const ICE = COLOR.winterSaleIceBlue;
const FROST = COLOR.snowdayFrost;
const ICE_GLOW = fadeStops(ICE);
const CORE = fadeStops(COLOR.white, 0.3);

// each ring's h^FLARE, for its radius
const RING_FLARE = new Float32Array(RINGS);
for (let k = 0; k < RINGS; k++) RING_FLARE[k] = ((k + 0.5) / RINGS) ** FLARE;

interface State {
  bars: Point[];
  tornado: Tornado;
  charge: Charge;
  runEnd: number;
  diveMs: number;
  climaxMs: number;
  landMs: number;
  // the topmost and bottommost buttons
  top: number;
  bottom: number;
  // when the foot passes each button (bar order), the order they're passed
  // in, and how many have played
  passMs: Float32Array;
  passOrder: Int16Array;
  passed: number;
  swooshed: boolean;
  dived: boolean;
  // each bar's left end, live
  ends: Point[];
  // each speck: its button, where it starts off its button's end, when it's
  // torn off and caught, its seed and its spot on its own button's end
  src: Int16Array;
  ox: Float32Array;
  oy: Float32Array;
  tearMs: Float32Array;
  caughtMs: Float32Array;
  seed: Float32Array;
  jy: Float32Array;
  // the blizzard's flakes: seed and spot on its own button's end
  bSeed: Float32Array;
  bJx: Float32Array;
  bJy: Float32Array;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const home: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const feet: Point = { x: 0, y: 0 };
const p: Point = { x: 0, y: 0 };
const q: Point = { x: 0, y: 0 };

// each tap also levelling the topmost open floor that can take it
const frostTaps = defineTapPerk("Frost", (t) => {
  for (let k = t.floors.length - 1; k >= 0; k--) {
    const floor = t.floors[k];
    if (floor.unlocked && !isFloorMaxed(floor)) {
      t.levelUp(floor, 1, "+1 Lvl");
      return;
    }
  }
});

// a six-armed snowflake, white on a pale blue glow, drawn once
let flake: HTMLCanvasElement | null = null;
function getFlake(): HTMLCanvasElement {
  if (flake) return flake;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (!g) return (flake = c);
  const m = size / 2;
  const glow = g.createRadialGradient(m, m, 0, m, m, m);
  glow.addColorStop(0, "rgba(165,243,252,0.75)");
  glow.addColorStop(0.45, "rgba(125,211,252,0.3)");
  glow.addColorStop(1, "rgba(125,211,252,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  g.lineCap = "round";
  for (const [width, color] of [
    [5, ICE],
    [2.5, COLOR.white],
  ] as const) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      g.moveTo(m, m);
      g.lineTo(m + cos * 26, m + sin * 26);
      const bx = m + cos * 15;
      const by = m + sin * 15;
      for (const turn of [-0.8, 0.8]) {
        g.moveTo(bx, by);
        g.lineTo(bx + Math.cos(a + turn) * 9, by + Math.sin(a + turn) * 9);
      }
    }
    g.stroke();
  }
  return (flake = c);
}

// a snowflake `size` px out from its middle, turned rot, at ctx's alpha
function stampFlake(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rot: number,
): void {
  if (size <= 0 || !flake) return;
  const w = flake.width;
  if (
    queueTurnedLight(
      ctx,
      flake,
      0,
      0,
      w,
      w,
      x - size,
      y - size,
      size * 2,
      size * 2,
      Math.cos(rot),
      Math.sin(rot),
      ctx.globalAlpha,
    )
  )
    return;
  ctx.drawImage(flake, x - size, y - size, size * 2, size * 2);
}

// a button frosted `since` ms ago at its end: an icy flash, crystals popping
// on its edge and flakes bursting off it to the left
function frost(
  ctx: CanvasRenderingContext2D,
  end: Point,
  since: number,
  scale: number,
  base: number,
  k: number,
): void {
  if (since < 0 || since >= FROST_MS) return;
  const u = since / FROST_MS;
  const out = easeOut(u);
  ctx.globalAlpha = base * (1 - u);
  drawGlow(ctx, ICE_GLOW, end.x, end.y, FROST_GLOW * scale * (0.5 + 0.8 * u));
  drawGlow(ctx, CORE, end.x, end.y, FROST_GLOW * scale * 0.45 * (1 - u));
  for (let e = -1; e <= 1; e++)
    stampFlake(
      ctx,
      end.x,
      end.y + e * BTN_H * 0.4,
      EDGE_FLAKE * scale * (1.5 - 0.7 * u),
      k + e + u * 3,
    );
  for (let f = 0; f < FROST_FLAKES; f++) {
    const a = Math.PI / 2 + ((f + 0.5) / FROST_FLAKES) * Math.PI;
    const d = FROST_REACH * scale * out;
    stampFlake(
      ctx,
      end.x + Math.cos(a) * d,
      end.y + Math.sin(a) * d * 0.8,
      12 * scale * (1 - 0.5 * u),
      a + u * 5,
    );
  }
}

// the icy funnel at ms, `alpha` fading it: a pale blue body, rings of
// snowflakes and frost glitter whirling (the near side brighter) and snow
// kicked round its foot
function drawFunnel(
  ctx: CanvasRenderingContext2D,
  t: Tornado,
  ms: number,
  base: number,
): void {
  if (ms < t.startMs) return;
  const grow = tornadoGrow(t, ms);
  const turn = tornadoTurn(t, ms);
  for (let k = 0; k < 2; k++) {
    const h = (k + 0.5) / 2;
    funnelAt(t, ms, h, 0, p);
    funnelAt(t, ms, h, Math.PI, q);
    ctx.globalAlpha = base * 0.35;
    drawGlow(
      ctx,
      ICE_GLOW,
      (p.x + q.x) / 2,
      p.y,
      Math.abs(p.x - q.x) * 0.6 + 12,
    );
  }
  for (let ring = 0; ring < RINGS; ring++) {
    const h = (ring + 0.5) / RINGS;
    const r = lerp(t.foot, t.top, RING_FLARE[ring]) * grow;
    const spin = turn * lerp(LOW_SPIN, 1, h) + h * TWIST;
    const size = Math.max(6, r * SPECK);
    for (let j = 0; j < PER_RING; j++) {
      const i = ring * PER_RING + j;
      const a = spin + (j / PER_RING) * TAU;
      funnelAt(t, ms, h, a, p);
      const near = 0.5 + 0.5 * Math.sin(a);
      ctx.globalAlpha = base * (0.3 + 0.7 * near);
      const s = size * (0.6 + 0.4 * near);
      if (i % FLAKE_EVERY === 0) stampFlake(ctx, p.x, p.y, s * 1.7, a * 2);
      else stampGlimmer(ctx, p.x, p.y, s, i, i % 2 ? ICE : COLOR.white);
    }
  }
  t.at(ms, feet);
  const kick = t.foot * 2.6 * grow;
  for (let i = 0; i < SPRAY; i++) {
    const a = turn * LOW_SPIN * 1.3 + (i / SPRAY) * TAU;
    const out = kick * (0.7 + 0.3 * Math.sin(ms * 0.012 + i));
    ctx.globalAlpha = base * 0.75;
    stampGlimmer(
      ctx,
      feet.x + Math.cos(a) * out,
      feet.y + Math.sin(a) * out * 0.28,
      t.foot * 0.4,
      i + 200,
      FROST,
    );
  }
}

// where the foot is at ms (live): up the column, round in loops at the top,
// then diving to beside its own button
function footAt(state: State, ms: number, into: Point): Point {
  const { bars } = state;
  const colX = bars[0].x - BTN_W / 2 - GAP;
  const lo = bars[state.bottom].y + LEAD;
  const hi = bars[state.top].y - LEAD;
  into.x = colX;
  into.y = lerp(lo, hi, quicken(clamp01((ms - IN_MS) / CLIMB_MS)));
  const w = clamp01((ms - state.runEnd) / WHIP_MS);
  if (w > 0) {
    const a = WHIP_LAPS * TAU * w * w;
    into.x -= WHIP_R * (1 - Math.cos(a));
    into.y += WHIP_R * 0.5 * Math.sin(a);
  }
  const d = clamp01((ms - state.diveMs) / DIVE_MS);
  if (d > 0) {
    const e = d * d;
    into.x = lerp(into.x, colX + GAP * DIVE_IN, e);
    into.y = lerp(into.y, bars[0].y + BTN_H * 0.5, e);
  }
  trembleAt(chargeAt(state.charge, ms), ms, TREMBLE, shiver);
  into.x += shiver.x;
  into.y += shiver.y;
  return into;
}

registerFloorCrit("snowDevilCrit", {
  reward(t) {
    frostTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const n = bars.length;
    if (n === 0) return;
    getFlake();
    const order = byHeight(bars);
    const top = order[0];
    const bottom = order[n - 1];
    const lo = bars[bottom].y + LEAD;
    const hi = bars[top].y - LEAD;
    const span = lo - hi || 1;
    const runEnd = IN_MS + CLIMB_MS;
    const diveMs = runEnd + WHIP_MS;
    const climaxMs = diveMs + DIVE_MS;
    const landMs = climaxMs + FLING_MS;
    // frosted on the way up, bottom to top; its own landed on at the end
    const passMs = new Float32Array(n);
    const passOrder = new Int16Array(n);
    for (let k = 0; k < n; k++) {
      const b = order[n - 1 - k];
      passOrder[k] = b;
      passMs[b] =
        IN_MS + CLIMB_MS * quickenAt(clamp01((lo - bars[b].y) / span));
      hit(b, passMs[b], b === 0 ? 0 : 1);
    }
    hit(0, landMs, 2);
    // the specks off each button as it's passed, a double share off its own
    const src: number[] = [];
    const tearMs: number[] = [];
    for (let k = 0; k < n; k++) {
      const b = passOrder[k];
      const count = b === 0 ? OWN_CATCH : CATCH;
      for (let i = 0; i < count; i++) {
        src.push(b);
        tearMs.push(passMs[b] - TEAR_MS * 0.5 + i * TEAR_STAGGER_MS);
      }
    }
    const total = src.length;
    const ox = new Float32Array(total);
    const oy = new Float32Array(total);
    const caughtMs = new Float32Array(total);
    const seed = new Float32Array(total);
    const jy = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      ox[i] = holeHash(i, 7311) * 40;
      oy[i] = (holeHash(i, 7312) * 2 - 1) * BTN_H * 0.4;
      caughtMs[i] = tearMs[i] + TEAR_MS;
      seed[i] = holeHash(i, 7313);
      jy[i] = (holeHash(i, 7314) * 2 - 1) * BTN_H * 0.4;
    }
    const bSeed = new Float32Array(BLIZZARD);
    const bJx = new Float32Array(BLIZZARD);
    const bJy = new Float32Array(BLIZZARD);
    for (let i = 0; i < BLIZZARD; i++) {
      bSeed[i] = holeHash(i, 7315);
      bJx[i] = holeHash(i, 7316) * 30;
      bJy[i] = (holeHash(i, 7317) * 2 - 1) * BTN_H * 0.5;
    }
    const ends: Point[] = [];
    for (let b = 0; b < n; b++) ends.push({ x: 0, y: 0 });
    const state: State = {
      bars,
      tornado: planTornado((ms, into) => footAt(state, ms, into), {
        startMs: IN_MS,
        endMs: climaxMs,
        height: HEIGHT,
        foot: FOOT,
        top: TOP,
        spinHz: SPIN_HZ,
        sway: SWAY,
        growMs: GROW_MS,
      }),
      charge: planCharge(
        runEnd - CHARGE_LEAD_MS,
        climaxMs - runEnd + CHARGE_LEAD_MS,
        {
          climaxShake: 1.8,
          bang: false,
        },
      ),
      runEnd,
      diveMs,
      climaxMs,
      landMs,
      top,
      bottom,
      passMs,
      passOrder,
      passed: 0,
      swooshed: false,
      dived: false,
      ends,
      src: Int16Array.from(src),
      ox,
      oy,
      tearMs: Float32Array.from(tearMs),
      caughtMs,
      seed,
      jy,
      bSeed,
      bJx,
      bJy,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state || bars.length === 0) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { tornado, charge, climaxMs, landMs, ends, passMs } = state;
    const n = Math.min(bars.length, ends.length);
    for (let b = 0; b < n; b++) {
      ends[b].x = bars[b].x - BTN_W / 2;
      ends[b].y = bars[b].y;
    }
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.5 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    if (!state.swooshed && ms >= IN_MS) {
      state.swooshed = true;
      playSwoosh();
    }
    if (!state.dived && ms >= state.diveMs) {
      state.dived = true;
      playSwoosh();
    }
    const { passOrder } = state;
    while (
      state.passed < passOrder.length &&
      ms >= passMs[passOrder[state.passed]]
    )
      playSpinTick(1 + 0.15 * state.passed++);
    tickCharge(charge, ms, r.shake);
    // growing as it climbs, swelling as it whips round
    const c = chargeAt(charge, Math.min(ms, climaxMs));
    const grown = clamp01((ms - IN_MS) / CLIMB_MS);
    tornado.top = lerp(lerp(TOP, TOP * 1.4, grown), WHIP_TOP, c);
    tornado.height = lerp(lerp(HEIGHT, HEIGHT * 1.5, grown), WHIP_HEIGHT, c);
    tornado.at(ms, feet);
    const previous = ctx.globalCompositeOperation;
    const base = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms < climaxMs) {
      drawFunnel(ctx, tornado, ms, base);
      // the cold gathering at its foot as it whips round
      if (c > 0) {
        tornado.at(ms, feet);
        ctx.globalAlpha = base * c;
        drawGlow(ctx, ICE_GLOW, feet.x, feet.y, 60 + 120 * c);
        drawGlow(ctx, CORE, feet.x, feet.y, 50 * c);
      }
    }
    const { src, ox, oy, tearMs, caughtMs, seed, jy } = state;
    const own = ends[0];
    if (ms < landMs) {
      const fling = (ms - climaxMs) / FLING_MS;
      for (let i = 0; i < src.length; i++) {
        const tear = tearMs[i];
        if (ms < tear) continue;
        const caught = caughtMs[i];
        if (fling >= 0) {
          home.x = own.x + 8;
          home.y = own.y + jy[i];
          flingFrom(tornado, climaxMs, caught, seed[i], home, fling, spot);
        } else if (ms >= caught) {
          liftAt(tornado, ms, caught, seed[i], spot);
        } else {
          // ripped off its button's end into the foot
          const b = src[i];
          if (b >= n) continue;
          from.x = ends[b].x + ox[i];
          from.y = ends[b].y + oy[i];
          liftAt(tornado, ms, caught, seed[i], spot);
          const u = ((ms - tear) / (caught - tear)) ** 2;
          spot.x = lerp(from.x, spot.x, u);
          spot.y = lerp(from.y, spot.y, u);
        }
        ctx.globalAlpha = base;
        if (i % FLAKE_EVERY === 0)
          stampFlake(
            ctx,
            spot.x,
            spot.y,
            FLAKE_SIZE,
            seed[i] * TAU + ms * 0.01,
          );
        else
          stampGlimmer(
            ctx,
            spot.x,
            spot.y,
            SPECK_SIZE,
            i,
            i % 2 ? ICE : COLOR.white,
          );
      }
      // the funnel itself bursting into a blizzard onto its own
      if (fling >= 0) {
        const { bSeed, bJx, bJy } = state;
        ctx.globalAlpha = base;
        for (let i = 0; i < BLIZZARD; i++) {
          home.x = own.x + bJx[i];
          home.y = own.y + bJy[i];
          flingFrom(tornado, climaxMs, 0, bSeed[i], home, fling, spot);
          if (i % 2)
            stampFlake(ctx, spot.x, spot.y, FLAKE_SIZE * 1.2, i + ms * 0.012);
          else stampGlimmer(ctx, spot.x, spot.y, SPECK_SIZE, i, FROST);
        }
      }
    }
    // each button frosted as it's passed, its own again as it's landed on
    for (let b = 0; b < n; b++) frost(ctx, ends[b], ms - passMs[b], 1, base, b);
    frost(ctx, own, ms - landMs, OWN_FROST, base, 0);
    ctx.globalAlpha = base;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // the burst at its foot as it bursts, then its own blast
    drawDetonation(ctx, feet, ms - climaxMs, WHIP_BLAST, now);
    drawDetonation(ctx, own, ms - landMs, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
