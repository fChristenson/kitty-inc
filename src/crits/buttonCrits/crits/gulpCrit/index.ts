// Gulp, a button crit: the number shrinks into a hungry orb of light
// opening just left of its own button, which starts to pull: glitter tears
// off the end of every other button (each jolting as it's first drained) and
// streams across into it, a trickle then a flood, a crust of it whirling
// round the orb as it swells and trembles, the rumble rising; it collapses
// to a point and bursts, flinging it all back out onto every button in a
// ripple outwards, each blasting, its own last and biggest: each of their
// next taps also pays out the floor whose button gulped
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import { snapshotMap } from "../../../../shared/snapshotState";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the orb POLE px off its button's left end, ORB px glow at full, its core
// CORE; pulling from IN_MS for PULL_MS, each speck flying in over FLY_MS;
// the other buttons opening up over DRAIN_SPAN ms, quicker each
const POLE = 140;
const ORB = 150;
const CORE = WISP_SIZE * 1.3;
const TREMBLE = 12;
const PULL_MS = 1050;
const FLY_MS = 230;
const DRAIN_SPAN = 560;
const COLLAPSE_MS = 90;
// SPECKS specks of SPECK px tearing off a button's end GAP px out, spread
// END_H up and down, bowed BOW of their way; crusting the orb CRUST px out,
// whirling SPIN rad a ms
const SPECKS = 360;
const SPECK = 16;
const GAP = 12;
const END_H = 60;
const BOW = 0.35;
const CRUST: [number, number] = [18, 64];
const CRUST_SQUASH = 0.8;
const SPIN = 0.007;
// flung back out: landing FLY_BACK_MS after the burst, each button
// RIPPLE_MS after the one nearer, its own OWN_GAP_MS after the last, its
// specks looping OWN_BOW px out
const FLY_BACK_MS = 170;
const RIPPLE_MS = 40;
const OWN_GAP_MS = 90;
const OWN_BOW = 260;
const BURST_BLAST = 300;
const BLAST = 180;
const OWN_BLAST = 400;
// shakes by step: a button drained, a button's blast, its own
const SHAKES = [0.5, 1.3, 3];

interface State {
  charge: Charge;
  pullEnd: number;
  burstMs: number;
  // per speck: its button and when it tears off, its spread and bow there,
  // its spot on the crust, and which landing it's flung onto
  src: Uint16Array;
  emit: Float32Array;
  lift: Float32Array;
  bow: Float32Array;
  angle: Float32Array;
  reach: Float32Array;
  dst: Uint16Array;
  // per landing: its button and when it lands
  targets: Uint16Array;
  landAt: Float32Array;
}
const states = new WeakMap<Running, State>();
const orb: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const end: Point = { x: 0, y: 0 };
const atOrb = () => orb;

// the floor (an index into the building's floors) whose button gulped onto
// a button: each of its gulp taps also pays that floor out
const gulpers = snapshotMap<Floor, number>();
const gulpTaps = defineTapPerk("Gulp", (t) => {
  const k = gulpers.get(t.floor);
  const floor = k === undefined ? undefined : t.floors[k];
  if (floor?.unlocked) t.payout(floor, 1);
});

registerFloorCrit("gulpCrit", {
  reward(t) {
    const k = t.floors.indexOf(t.ownFloor);
    if (k >= 0) gulpers.set(t.floor, k);
    gulpTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const own = bars[0];
    const away = (b: number) =>
      Math.hypot(bars[b].x - own.x, bars[b].y - own.y);
    const others: number[] = [];
    for (let b = 1; b < bars.length; b++) others.push(b);
    others.sort((a, b) => away(a) - away(b));
    // drained nearest first, quicker each; alone, it drinks its own
    const sources = others.length ? others : [0];
    const drainAt = sources.map(
      (_, k) =>
        IN_MS + DRAIN_SPAN * Math.sqrt(k / Math.max(1, sources.length - 1)),
    );
    const firstEmit = drainAt.slice();
    const pullEnd = IN_MS + PULL_MS;
    const burstMs = pullEnd + COLLAPSE_MS;
    const targets = [...others, 0];
    const landAt = targets.map(
      (bar, j) =>
        burstMs + FLY_BACK_MS + j * RIPPLE_MS + (bar === 0 ? OWN_GAP_MS : 0),
    );
    const src = new Uint16Array(SPECKS);
    const emit = new Float32Array(SPECKS);
    const lift = new Float32Array(SPECKS);
    const bow = new Float32Array(SPECKS);
    const angle = new Float32Array(SPECKS);
    const reach = new Float32Array(SPECKS);
    const dst = new Uint16Array(SPECKS);
    // a trickle then a flood: each button opened gets the next speck, the
    // rest spread over the open ones
    let open = 0;
    let fresh = 0;
    for (let i = 0; i < SPECKS; i++) {
      const at = IN_MS + (PULL_MS - FLY_MS) * Math.sqrt((i + 1) / SPECKS);
      while (open < sources.length && drainAt[open] <= at) open++;
      let k: number;
      if (fresh < open) {
        k = fresh++;
        firstEmit[k] = at;
      } else k = Math.min(open - 1, Math.floor(holeHash(i, 7101) * open));
      src[i] = sources[k];
      emit[i] = at;
      lift[i] = (holeHash(i, 7102) - 0.5) * END_H;
      bow[i] = (holeHash(i, 7103) - 0.5) * 2 * BOW;
      angle[i] = holeHash(i, 7104) * Math.PI * 2;
      reach[i] = CRUST[0] + (CRUST[1] - CRUST[0]) * holeHash(i, 7105);
      dst[i] = i % targets.length;
    }
    if (others.length)
      for (let k = 0; k < sources.length; k++) hit(sources[k], firstEmit[k], 0);
    for (let j = 0; j < targets.length; j++)
      hit(targets[j], landAt[j], targets[j] === 0 ? 2 : 1);
    states.set(r, {
      charge: planCharge(IN_MS, PULL_MS + COLLAPSE_MS, {
        climaxShake: 2.6,
      }),
      pullEnd,
      burstMs,
      src,
      emit,
      lift,
      bow,
      angle,
      reach,
      dst,
      targets: Uint16Array.from(targets),
      landAt: Float32Array.from(landAt),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { charge, pullEnd, burstMs, landAt, targets } = state;
    const home = bars[0];
    orb.x = home.x - BTN_W / 2 - POLE;
    orb.y = home.y;
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        orb.x * u * u,
        orb.y * u * u,
        r.flashFont * (1 - 0.75 * u),
        { alpha: 1 - u * u },
      );
    }
    tickCharge(charge, ms, r.shake);
    const c = chargeAt(charge, Math.min(ms, burstMs));
    trembleAt(c, ms, TREMBLE, shiver);
    orb.x += shiver.x;
    orb.y += shiver.y;
    // collapsing to a point once it's gulped the last, gone as it bursts
    const collapse = clamp01((ms - pullEnd) / COLLAPSE_MS);
    const squeeze = 1 - collapse * collapse;
    const grow = (0.5 + 0.7 * c) * squeeze;
    if (ms >= IN_MS && ms < burstMs) {
      drawChargeGlow(ctx, orb, c * (0.4 + 0.6 * squeeze), ORB, now);
      drawChargeStreaks(ctx, orb, c, POLE * squeeze, ms);
      drawWispHead(ctx, atOrb, ms, now, CORE * (0.5 + c) * squeeze, c);
    }
    const { src, emit, lift, bow, angle, reach, dst } = state;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
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
        // its spot on the whirling crust
        const a = angle[i] + ms * SPIN;
        const d = reach[i] * grow;
        const cx = orb.x + Math.cos(a) * d;
        const cy = orb.y + Math.sin(a) * d * CRUST_SQUASH;
        if (ms < at + FLY_MS) {
          // torn off its button's end, snapping in faster and faster
          const from = bars[src[i]];
          const fx = from.x - BTN_W / 2 - GAP;
          const fy = from.y + lift[i];
          const u = (ms - at) / FLY_MS;
          const e = u * u * u;
          const w = 1 - e;
          const mx = (fx + cx) / 2 - (cy - fy) * bow[i];
          const my = (fy + cy) / 2 + (cx - fx) * bow[i];
          x = w * w * fx + 2 * w * e * mx + e * e * cx;
          y = w * w * fy + 2 * w * e * my + e * e * cy;
        } else {
          x = cx;
          y = cy;
        }
      } else {
        // flung back out onto its landing's button end
        const bar = targets[j];
        const onto = bars[bar];
        const tx = onto.x - BTN_W / 2 - GAP;
        const ty = onto.y + lift[i];
        const u = (ms - burstMs) / (lands - burstMs);
        const e = u * u;
        const w = 1 - e;
        let mx = (orb.x + tx) / 2 - (ty - orb.y) * bow[i];
        let my = (orb.y + ty) / 2 + (tx - orb.x) * bow[i];
        if (bar === 0) {
          // its own's loop out wide round the blast, landing last
          mx -= OWN_BOW * 0.5;
          my += OWN_BOW * (bow[i] > 0 ? 1 : -1);
        }
        x = w * w * orb.x + 2 * w * e * mx + e * e * tx;
        y = w * w * orb.y + 2 * w * e * my + e * e * ty;
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
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, orb, ms - burstMs, BURST_BLAST, now);
    for (let j = 0; j < targets.length; j++) {
      const bar = targets[j];
      end.x = bars[bar].x - BTN_W / 2;
      end.y = bars[bar].y;
      drawDetonation(
        ctx,
        end,
        ms - landAt[j],
        bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
