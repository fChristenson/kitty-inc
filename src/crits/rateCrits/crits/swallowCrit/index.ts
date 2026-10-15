// Swallow, a rate crit: the number bursts into glitter round the top bar's
// readout and a black hole opens in it, pulling it all in, a trickle then a
// flood, swirling faster and tighter; it swallows the last, collapses and
// spits the whole lot down into the next readout, where a bigger hole opens
// and gulps it down with that bar's own glitter, and so on down the
// building, quicker and heavier each, every readout turning over as it
// spits; the last and biggest hole, at its own readout, swallows the lot,
// trembling, and bursts it out in the biggest blast: every bar pays much
// more, fading back to normal
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { drawGravityHole } from "../../../../shared/animationStyles/clutter";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
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

const IN_MS = 120;
// the holes at the readouts (READOUT of a bar's half width out), each
// gulping for GULP_MS (quicker each, its own OWN_GULP_MS), HOLE[0]..HOLE[1]
// across from the first to the last
const READOUT = 0.6;
const GULP_MS: [number, number] = [420, 220];
const OWN_GULP_MS = 520;
const HOLE: [number, number] = [150, 380];
const GLOW = 1.5;
const TREMBLE = 16;
// the rumble: a shake RUMBLE[0]..[1] every RUMBLE_MS[0]..[1] as a gulp fills
const RUMBLE: [number, number] = [0.15, 0.8];
const RUMBLE_MS: [number, number] = [150, 45];
// the glitter: NEW specks strewn round each hole out to STREW px, swirling
// in at SPIN rad per its way in; spat to the next hole down a jet JET px
// wide over SPIT_MS, landing LAND px round it
const NEW = 40;
const STREW = 340;
const SPIN = 7;
const SPIT_MS = 110;
const JET = 70;
const LAND = 180;
const CORE = 14;
const SPECK = 24;
// bursting out over BURST_MS at the end, BURST px/ms, with SIDES blasts
// round it SIDE px out
const BURST_MS = 500;
const BURST = 3.5;
const BLAST = 240;
const OWN_BLAST = 480;
const SIDE = 170;
const SIDE_BLAST = 200;
const SIDE_EVERY_MS = 45;
const SIDES = 4;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1.1, 3];

interface Hole {
  bar: number;
  own: boolean;
  open: number;
  close: number;
  // live
  at: Point;
}
interface State {
  holes: Hole[];
  // each speck's first hole, its angle and reach, and its share of the way
  // through a gulp it's caught
  joins: Uint8Array;
  angles: Float32Array;
  reach: Float32Array;
  catches: Float32Array;
  nextRumble: number;
}
const states = new WeakMap<Running, State>();
const bit: Point = { x: 0, y: 0 };
const centre: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const side: Point = { x: 0, y: 0 };

// a gulped bar: from `from` it pays payout times as much, fading to normal
// by `until`
const gulps = defineBarEffect<{ from: number; until: number }>({
  payout: (g, now) =>
    1 +
    (meta.values.payout - 1) *
      (1 - clamp01((now - g.from) / (g.until - g.from))),
  ended: (g, now) => now >= g.until,
});

registerFloorCrit("swallowCrit", {
  reward(t) {
    t.flipRate();
    gulps.set(t.floor, {
      from: t.now,
      until: t.now + (t.own ? meta.values.ownMs : meta.values.ms),
    });
    t.punch(`x${meta.values.payout} Pay`);
  },
  plan(r, bars, hit) {
    // top down, its own last
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((p, q) => bars[p].y - bars[q].y);
    order.push(0);
    const holes: Hole[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const ms = own
        ? OWN_GULP_MS
        : lerp(GULP_MS[0], GULP_MS[1], k / Math.max(1, order.length - 2));
      holes.push({ bar, own, open: t, close: t + ms, at: { x: 0, y: 0 } });
      hit(bar, t + ms, own ? 2 : 1);
      t += ms;
    });
    const n = NEW * holes.length;
    const joins = new Uint8Array(n);
    const angles = new Float32Array(n);
    const reach = new Float32Array(n);
    const catches = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      joins[i] = Math.floor(i / NEW);
      angles[i] = holeHash(i, 4410) * Math.PI * 2;
      reach[i] = 0.4 + 0.6 * Math.sqrt(holeHash(i, 4411));
      // a trickle, then a flood
      catches[i] = Math.sqrt(holeHash(i, 4412)) * 0.9;
    }
    states.set(r, { holes, joins, angles, reach, catches, nextRumble: 0 });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    const { holes, joins, angles, reach, catches } = state;
    if (ms < IN_MS) {
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
      return;
    }
    for (let k = 0; k < holes.length; k++) {
      const h = holes[k];
      h.at.x = bars[h.bar].x + half * READOUT;
      h.at.y = bars[h.bar].y;
    }
    // the hole gulping now, swelling and closing to a point at the end
    let k = 0;
    while (k < holes.length - 1 && ms >= holes[k].close) k++;
    const hole = holes[k];
    const last = holes[holes.length - 1];
    const g = clamp01((ms - hole.open) / (hole.close - hole.open));
    const heavy = (k + 1) / holes.length;
    // trembling and rumbling harder as it fills, heavier down the building
    trembleAt(g * heavy, ms, TREMBLE, shiver);
    centre.x = hole.at.x + shiver.x;
    centre.y = hole.at.y + shiver.y;
    if (ms < last.close && ms >= state.nextRumble) {
      r.shake(lerp(RUMBLE[0], RUMBLE[1], g) * (0.5 + heavy));
      state.nextRumble = ms + lerp(RUMBLE_MS[0], RUMBLE_MS[1], g);
    }
    if (ms < last.close) {
      const size =
        lerp(HOLE[0], HOLE[1], k / Math.max(1, holes.length - 1)) *
        (0.5 + 0.7 * g) *
        (1 - clamp01((g - 0.9) / 0.1));
      drawChargeGlow(ctx, centre, g, size * GLOW, now);
      drawGravityHole(ctx, centre, size, 1, ms, now);
      // the jet of glitter spat down from the last hole
      const spat = clamp01((ms - hole.open) / SPIT_MS);
      if (k > 0 && spat < 1)
        drawBeam(ctx, holes[k - 1].at, centre, JET * (1 - spat), 1 - spat);
    }
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < joins.length; i++) {
      const join = joins[i];
      if (k < join) continue;
      if (ms >= last.close) {
        // burst out of the last hole
        const since = ms - last.close;
        if (since >= BURST_MS) continue;
        const out = CORE + BURST * since * (0.5 + reach[i]);
        bit.x = last.at.x + Math.cos(angles[i]) * out;
        bit.y = last.at.y + Math.sin(angles[i]) * out;
        ctx.globalAlpha = 1 - since / BURST_MS;
      } else {
        // strewn round its first hole, or spat in from the last one
        const from = join === k ? STREW : LAND;
        const spat = join < k ? clamp01((ms - hole.open) / SPIT_MS) : 1;
        // caught at its share of the gulp, swirling in faster and tighter
        const u = clamp01(g / Math.max(0.05, catches[i] + 0.1));
        const r0 = from * reach[i];
        const rad = CORE + (r0 - CORE) * (1 - u * u);
        const a = angles[i] + SPIN * u * u + (ms - hole.open) * 0.02 * u;
        bit.x = centre.x + Math.cos(a) * rad;
        bit.y = centre.y + Math.sin(a) * rad * 0.6;
        if (spat < 1) {
          const prev = holes[k - 1].at;
          const e = spat * spat;
          bit.x = lerp(prev.x, bit.x, e);
          bit.y = lerp(prev.y, bit.y, e);
        }
        ctx.globalAlpha = join === k ? clamp01((ms - hole.open) / 80) : 1;
      }
      stampGlimmer(
        ctx,
        bit.x,
        bit.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    for (let j = 0; j < holes.length; j++)
      drawDetonation(
        ctx,
        holes[j].at,
        ms - holes[j].close,
        holes[j].own ? OWN_BLAST : BLAST,
        now,
      );
    // the last burst blasting out round its readout
    for (let s = 0; s < SIDES; s++) {
      const a = (s / SIDES) * Math.PI * 2 + Math.PI / 4;
      side.x = last.at.x + Math.cos(a) * SIDE;
      side.y = last.at.y + Math.sin(a) * SIDE * 0.6;
      drawDetonation(
        ctx,
        side,
        ms - last.close - SIDE_EVERY_MS * (s + 1),
        SIDE_BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
