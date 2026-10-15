// Plughole, a button crit: the number shrinks into a plughole of light that
// opens beside the middle of the column of buttons and starts to drain: the
// shine of every button in view tears off its end and swirls in along
// spiralling streams, a trickle then a flood, the whirl spinning ever faster,
// the hole swelling, gurgling and trembling as the rumble rises; it collapses
// to a point and bursts, firing the whirl back out in spiralling arcs onto
// every button down the column, each flashing and turning over, its own last
// in the big blast: each of their next taps also hires a worker on the open
// floor two below
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed } from "../../../../gameState";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawGravityHole } from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
} from "../../../floorCrits/critPlayer";

const TAU = Math.PI * 2;
const IN_MS = 120;
// the hole POLE px left of the column's leftmost button end, HOLE px across
// at full, its glow GLOW; draining from IN_MS for PULL_MS, collapsing over
// COLLAPSE_MS
const POLE = 190;
const HOLE = 180;
const GLOW = 260;
const TREMBLE = 12;
const GURGLE = 0.22;
const PULL_MS = 1000;
const COLLAPSE_MS = 90;
// the whirl spins SPIN0 rad a ms at first, SPIN1 at full
const SPIN0 = 0.004;
const SPIN1 = 0.022;
const SPIN_PULL = SPIN0 * PULL_MS + ((SPIN1 - SPIN0) * PULL_MS) / 3;
// SPECKS specks of SPECK px tearing off a button's end GAP px out, spread
// over its height; spiralling in over FLY_MS with an extra turn, onto a
// whirl CRUST px out
const SPECKS = 380;
const SPECK = 15;
const GAP = 12;
const FLY_MS = 240;
const CRUST: [number, number] = [16, 74];
// fired back out: the top button's specks landing FLY_OUT_MS after the
// burst, each one down RIPPLE_MS later, its own OWN_GAP_MS after the last
// (with OWN_SHARE times the specks)
const FLY_OUT_MS = 180;
const RIPPLE_MS = 35;
const OWN_GAP_MS = 110;
const OWN_SHARE = 3;
// a drained button's shine, a landing's flash
const SHINE = 120;
const FLASH = 230;
const FLASH_MS = 220;
const BURST_BLAST = 280;
const OWN_BLAST = 420;
// shakes by step: a button drained, a button turned over, its own
const SHAKES = [0.5, 1.2, 3];

const SHINE_STOPS = fadeStops(COLOR.heavenlyGold);
const FLASH_STOPS = fadeStops(COLOR.white, 0.25);

interface State {
  charge: Charge;
  pullEnd: number;
  burstMs: number;
  // per bar: when its shine first tears off (Infinity if never)
  firstEmit: Float32Array;
  // per speck: its button, when it tears off and its spread there; its spot
  // on the whirl; the turns it swirls in and out through; its landing
  src: Uint16Array;
  emit: Float32Array;
  lift: Float32Array;
  angle: Float32Array;
  reach: Float32Array;
  turnIn: Float32Array;
  turnOut: Float32Array;
  dst: Uint16Array;
  // per landing: its button and when it lands
  targets: Uint16Array;
  landAt: Float32Array;
}
const states = new WeakMap<Running, State>();
const hole: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const end: Point = { x: 0, y: 0 };

// how far round the whirl has spun by ms: quickening over the pull, flat
// out after
function spinAt(ms: number): number {
  const t = ms - IN_MS;
  if (t <= 0) return 0;
  if (t <= PULL_MS)
    return SPIN0 * t + ((SPIN1 - SPIN0) * t * t * t) / (3 * PULL_MS * PULL_MS);
  return SPIN_PULL + SPIN1 * (t - PULL_MS);
}

// the hole's spot: left of the column's leftmost button end, level with the
// middle of the column
function placeHole(bars: Point[], out: Point): Point {
  let left = Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (let b = 0; b < bars.length; b++) {
    const bar = bars[b];
    if (bar.x < left) left = bar.x;
    if (bar.y < top) top = bar.y;
    if (bar.y > bottom) bottom = bar.y;
  }
  out.x = left - BTN_W / 2 - POLE;
  out.y = (top + bottom) / 2;
  return out;
}

const wrap = (a: number) => a - TAU * Math.floor(a / TAU);

// each tap also hiring a worker on the open floor two below
const plugTaps = defineTapPerk("Plug", (t) => {
  const below = t.floors[t.floors.indexOf(t.floor) - 2];
  if (below?.unlocked && !isFloorMaxed(below)) t.hire(below);
});

registerFloorCrit("plugholeCrit", {
  reward(t) {
    plugTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    placeHole(bars, hole);
    const pullEnd = IN_MS + PULL_MS;
    const burstMs = pullEnd + COLLAPSE_MS;
    // fired out top to bottom, its own last
    const others: number[] = [];
    for (let b = 1; b < bars.length; b++) others.push(b);
    others.sort((a, b) => bars[a].y - bars[b].y);
    const targets = [...others, 0];
    const landAt = new Float32Array(targets.length);
    for (let j = 0; j < targets.length; j++)
      landAt[j] =
        burstMs +
        FLY_OUT_MS +
        j * RIPPLE_MS +
        (targets[j] === 0 ? OWN_GAP_MS : 0);
    const firstEmit = new Float32Array(bars.length).fill(Infinity);
    const src = new Uint16Array(SPECKS);
    const emit = new Float32Array(SPECKS);
    const lift = new Float32Array(SPECKS);
    const angle = new Float32Array(SPECKS);
    const reach = new Float32Array(SPECKS);
    const turnIn = new Float32Array(SPECKS);
    const turnOut = new Float32Array(SPECKS);
    const dst = new Uint16Array(SPECKS);
    const shares = targets.length + OWN_SHARE - 1;
    for (let i = 0; i < SPECKS; i++) {
      // a trickle then a flood, every button giving up its first speck early
      const at = IN_MS + (PULL_MS - FLY_MS) * Math.sqrt((i + 1) / SPECKS);
      const b =
        i < bars.length ? i : Math.floor(holeHash(i, 7301) * bars.length);
      if (firstEmit[b] === Infinity) firstEmit[b] = at;
      src[i] = b;
      emit[i] = at;
      lift[i] = (holeHash(i, 7302) - 0.5) * BTN_H * 0.8;
      angle[i] = holeHash(i, 7303) * TAU;
      reach[i] = CRUST[0] + (CRUST[1] - CRUST[0]) * holeHash(i, 7304);
      const fromA = Math.atan2(
        bars[b].y + lift[i] - hole.y,
        bars[b].x - BTN_W / 2 - GAP - hole.x,
      );
      turnIn[i] = wrap(angle[i] + spinAt(at + FLY_MS) - fromA) + TAU;
      const j = Math.min(i % shares, targets.length - 1);
      dst[i] = j;
      const onto = bars[targets[j]];
      const toA = Math.atan2(
        onto.y + lift[i] - hole.y,
        onto.x - BTN_W / 2 - GAP - hole.x,
      );
      turnOut[i] = wrap(toA - angle[i] - spinAt(burstMs));
    }
    for (let b = 1; b < bars.length; b++)
      if (firstEmit[b] < Infinity) hit(b, firstEmit[b], 0);
    for (let j = 0; j < targets.length; j++)
      hit(targets[j], landAt[j], targets[j] === 0 ? 2 : 1);
    states.set(r, {
      charge: planCharge(IN_MS, PULL_MS + COLLAPSE_MS, { climaxShake: 2.4 }),
      pullEnd,
      burstMs,
      firstEmit,
      src,
      emit,
      lift,
      angle,
      reach,
      turnIn,
      turnOut,
      dst,
      targets: Uint16Array.from(targets),
      landAt,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { charge, pullEnd, burstMs, firstEmit, landAt, targets } = state;
    placeHole(bars, hole);
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        hole.x * u * u,
        hole.y * u * u,
        r.flashFont * (1 - 0.75 * u),
        { alpha: 1 - u * u },
      );
    }
    tickCharge(charge, ms, r.shake);
    const c = chargeAt(charge, Math.min(ms, burstMs));
    trembleAt(c, ms, TREMBLE, shiver);
    hole.x += shiver.x;
    hole.y += shiver.y;
    const collapse = clamp01((ms - pullEnd) / COLLAPSE_MS);
    const squeeze = 1 - collapse * collapse;
    const spin = spinAt(ms);
    // gurgling: a gulp each time the whirl comes round, quicker as it spins up
    const gurgle = Math.max(0, Math.sin(spin * 0.9)) ** 6;
    const grow = (0.6 + 0.6 * c) * squeeze * (1 + GURGLE * gurgle);
    const previous = ctx.globalCompositeOperation;
    if (ms >= IN_MS && ms < burstMs) {
      drawChargeGlow(ctx, hole, c * (0.4 + 0.6 * squeeze), GLOW, now);
      drawGravityHole(ctx, hole, HOLE * (0.3 + 0.9 * c) * grow, 1, ms, now);
    }
    ctx.globalCompositeOperation = "lighter";
    // the shine flickering on each button's end while it drains
    if (ms < pullEnd)
      for (let b = 0; b < bars.length; b++) {
        if (ms < firstEmit[b]) continue;
        ctx.globalAlpha = 0.3 + 0.25 * Math.sin(ms * 0.04 + b * 1.7);
        drawGlow(ctx, SHINE_STOPS, bars[b].x - BTN_W / 2, bars[b].y, SHINE);
      }
    ctx.globalAlpha = 1;
    const { src, emit, lift, angle, reach, turnIn, turnOut, dst } = state;
    beginLightBatch(ctx);
    for (let i = 0; i < SPECKS; i++) {
      const at = emit[i];
      if (ms < at) continue;
      const j = dst[i];
      const lands = landAt[j];
      if (ms >= lands) continue;
      let x: number;
      let y: number;
      if (ms < burstMs) {
        const crust = angle[i] + spin;
        const d = reach[i] * grow;
        if (ms < at + FLY_MS) {
          // torn off its button's end, spiralling in faster and faster
          const from = bars[src[i]];
          const fx = from.x - BTN_W / 2 - GAP - hole.x;
          const fy = from.y + lift[i] - hole.y;
          const fromA = Math.atan2(fy, fx);
          const fromD = Math.hypot(fx, fy);
          const landA = angle[i] + spinAt(at + FLY_MS);
          const goal = fromA + turnIn[i];
          const toA = landA + TAU * Math.round((goal - landA) / TAU);
          const u = (ms - at) / FLY_MS;
          const a = fromA + (toA - fromA) * u * u * u;
          const dd = fromD + (d - fromD) * u * u;
          x = hole.x + Math.cos(a) * dd;
          y = hole.y + Math.sin(a) * dd;
        } else {
          x = hole.x + Math.cos(crust) * d;
          y = hole.y + Math.sin(crust) * d;
        }
      } else {
        // fired back out in a spiralling arc onto its button's end
        const onto = bars[targets[j]];
        const tx = onto.x - BTN_W / 2 - GAP - hole.x;
        const ty = onto.y + lift[i] - hole.y;
        const toD = Math.hypot(tx, ty);
        const fromA = angle[i] + spinAt(burstMs);
        const goal = fromA + turnOut[i];
        const tA = Math.atan2(ty, tx);
        const toA = tA + TAU * Math.round((goal - tA) / TAU);
        const u = (ms - burstMs) / (lands - burstMs);
        const a = fromA + (toA - fromA) * (1 - (1 - u) * (1 - u));
        x = hole.x + Math.cos(a) * toD * u;
        y = hole.y + Math.sin(a) * toD * u;
      }
      stampGlimmer(
        ctx,
        x,
        y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    // each button down the column flashing as its arc lands
    for (let j = 0; j < targets.length; j++) {
      if (targets[j] === 0) continue;
      const since = ms - landAt[j];
      if (since < 0 || since >= FLASH_MS) continue;
      const u = since / FLASH_MS;
      const onto = bars[targets[j]];
      ctx.globalAlpha = 1 - u;
      drawGlow(
        ctx,
        FLASH_STOPS,
        onto.x - BTN_W / 2,
        onto.y,
        FLASH * (0.6 + 0.6 * u),
      );
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, hole, ms - burstMs, BURST_BLAST, now);
    end.x = bars[0].x - BTN_W / 2;
    end.y = bars[0].y;
    drawDetonation(ctx, end, ms - landAt[targets.length - 1], OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
