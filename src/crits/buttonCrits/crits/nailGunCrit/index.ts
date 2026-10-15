// Nail Gun, a button crit: the number arcs down beside a button and turns
// into a gun wisp that hammers nail wisps into it, a muzzle flash and a pop
// each, then hops on to the next, quicker each volley, the crit's own last in
// the heaviest volley: the next crit landing on a nailed button sticks there
// for a few taps
import meta from "./meta";
import { addNails } from "../../buttonBonus";
import { drawMuzzleFlash } from "../../../../shared/animationStyles/bullets";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

// the number's arc onto the gun's first spot
const ARC_MS = 180;
const ARC_RISE = 120;
// the gun hovers this far left of a button's middle, hopping between them
const GUN: Point = { x: -(BTN_W / 2 + 150), y: 0 };
const HOP_MS = 110;
const HOP_ARC = 80;
// nails per button (more on its own), a gap after each, quickening
const NAILS = 4;
const OWN_NAILS = 7;
const NAIL_GAP_MS: [number, number] = [75, 40];
const NAIL_MS = 90;
const SPREAD_X = 0.35;
const SPREAD_Y = 0.25;
const MUZZLE_MS = 80;
const MUZZLE = 100;
const NAIL_BLAST = 55;
const BLAST = 100;
const OWN_BLAST = 200;
const TAIL_MS = 900;

interface Nail {
  bar: number;
  fired: number;
  lands: number;
  // where it strikes, from its button's middle
  offset: Point;
  path: (ms: number) => Point | null;
}

interface Volley {
  bar: number;
  starts: number;
  done: number;
}

interface State {
  bars: Point[];
  nails: Nail[];
  volleys: Volley[];
  gun: (ms: number) => Point | null;
}

const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("nailGunCrit", {
  // its next crit sticks for a few taps, twice as many on its own
  reward(t) {
    const taps = meta.values.taps;
    addNails(t.floor, t.own ? taps * 2 : taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const state: State = { bars, nails: [], volleys: [], gun: () => null };
    let t = ARC_MS;
    order.forEach((bar, k) => {
      const count = bar === 0 ? OWN_NAILS : NAILS;
      const gap = lerp(
        NAIL_GAP_MS[0],
        NAIL_GAP_MS[1],
        k / Math.max(1, order.length - 1),
      );
      const starts = t;
      for (let j = 0; j < count; j++) {
        const n = state.nails.length;
        const offset = {
          x: (holeHash(n, 91) - 0.5) * 2 * SPREAD_X * BTN_W,
          y: (holeHash(n, 92) - 0.5) * 2 * SPREAD_Y * BTN_H,
        };
        const fired = t;
        const at: Point = { x: 0, y: 0 };
        state.nails.push({
          bar,
          fired,
          lands: fired + NAIL_MS,
          offset,
          path: (ms) => {
            const u = (ms - fired) / NAIL_MS;
            if (u < 0 || u > 1) return null;
            const b = state.bars[bar];
            at.x = b.x + lerp(GUN.x, offset.x, u);
            at.y = b.y + lerp(GUN.y, offset.y, u);
            return at;
          },
        });
        const last = j === count - 1;
        hit(bar, fired + NAIL_MS, last ? (bar === 0 ? 2 : 1) : 0);
        if (!last) t += gap;
      }
      state.volleys.push({ bar, starts, done: t + NAIL_MS });
      t += NAIL_MS + HOP_MS;
    });
    // the gun: the number's arc onto the first button, hovering beside each
    // while it fires, hopping on to the next
    const at: Point = { x: 0, y: 0 };
    const { volleys } = state;
    const arc = (ax: number, ay: number, bx: number, by: number, u: number) => {
      const p = u * u * (3 - 2 * u);
      const peak = Math.min(ay, by) - HOP_ARC;
      at.x = lerp(ax, bx, p);
      at.y = (1 - p) * (1 - p) * ay + 2 * (1 - p) * p * peak + p * p * by;
      return at;
    };
    state.gun = (ms) => {
      const last = volleys[volleys.length - 1];
      if (ms < ARC_MS || ms > last.done) return null;
      for (let k = 0; k < volleys.length; k++) {
        const b = state.bars[volleys[k].bar];
        if (ms < volleys[k].done || k === volleys.length - 1) {
          at.x = b.x + GUN.x;
          at.y = b.y + GUN.y;
          return at;
        }
        if (ms < volleys[k + 1].starts) {
          const next = state.bars[volleys[k + 1].bar];
          return arc(
            b.x + GUN.x,
            b.y + GUN.y,
            next.x + GUN.x,
            next.y + GUN.y,
            (ms - volleys[k].done) / (volleys[k + 1].starts - volleys[k].done),
          );
        }
      }
      return null;
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const first = bars[state.volleys[0].bar];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      const x = first.x + GUN.x;
      const y = first.y + GUN.y;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * p,
        y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    drawWisp(ctx, state.gun, ms, now, WISP_SIZE * 1.6, 0.6);
    for (const nail of state.nails) {
      const b = bars[nail.bar];
      spot.x = b.x + GUN.x;
      spot.y = b.y + GUN.y;
      drawMuzzleFlash(ctx, spot, 0, (ms - nail.fired) / MUZZLE_MS, MUZZLE);
      drawWispBetween(
        ctx,
        nail.path,
        ms,
        now,
        WISP_SIZE * 0.7,
        1,
        nail.fired,
        nail.lands,
      );
      spot.x = b.x + nail.offset.x;
      spot.y = b.y + nail.offset.y;
      drawDetonation(ctx, spot, ms - nail.lands, NAIL_BLAST, now);
    }
    for (const volley of state.volleys)
      drawDetonation(
        ctx,
        bars[volley.bar],
        ms - volley.done,
        volley.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.4 : step === 1 ? 1 : 0.4),
});
