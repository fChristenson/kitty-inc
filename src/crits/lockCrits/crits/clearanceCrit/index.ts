// Clearance, a lock crit: the number arcs onto the locked floor's edge and
// becomes a scanner beam sweeping the floor and its unlock price back and
// forth, quicker each pass, the price flaring white as it's crossed; then the
// price flips over and shatters down to a fraction of it
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 180;
const ARC_RISE = 120;
const POP_BLAST = 100;
const PASSES = 5;
// each pass's time, quickening
const PASS_MS: [number, number] = [330, 130];
// the beam sweeps between these either side of the floor's middle, from its
// top to its bottom
const SWEEP_X = 560;
const BEAM_HALF_H = 300;
const BEAM_WIDTH = 46;
const EDGE_BLAST = 70;
// the price flares white while the beam is this close
const PRICE_REACH = 160;
const FLIP_GAP_MS = 40;
const FLIP_MS = 240;
const SHATTER_BLAST = 230;
const GLOW = 360;
const GLOW_MS = 700;
const TAIL_MS = 900;

interface State {
  bars: Point[];
  ends: number[];
  flip: number;
  top: (ms: number) => Point | null;
  bottom: (ms: number) => Point | null;
}

const states = new WeakMap<Running, State>();
const GLOW_STOPS = glowStops(COLOR.heavenlyGold);
const start: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const edge: Point = { x: 0, y: 0 };

// the beam's offset from the floor's middle at ms, null off its sweep
function beamX(ends: number[], ms: number): number | null {
  let start = ARC_MS;
  for (let k = 0; k < ends.length; k++) {
    if (ms < ends[k]) {
      const u = (ms - start) / (ends[k] - start);
      const p = u * u * (3 - 2 * u);
      return k % 2 ? lerp(SWEEP_X, -SWEEP_X, p) : lerp(-SWEEP_X, SWEEP_X, p);
    }
    start = ends[k];
  }
  return null;
}

registerFloorCrit("clearanceCrit", {
  plan(r, bars, hit) {
    const ends: number[] = [];
    let t = ARC_MS;
    for (let k = 0; k < PASSES; k++) {
      t += lerp(PASS_MS[0], PASS_MS[1], k / (PASSES - 1));
      ends.push(t);
      hit(0, t, 0);
    }
    const flip = t + FLIP_GAP_MS;
    hit(0, flip + FLIP_MS / 2, 1);
    hit(0, ARC_MS, 0);
    const state: State = {
      bars,
      ends,
      flip,
      top: () => null,
      bottom: () => null,
    };
    // the beam's two ends, riding it as it sweeps
    const end = (dy: number) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const x = beamX(ends, ms);
        if (x === null) return null;
        at.x = state.bars[0].x + x;
        at.y = state.bars[0].y + dy;
        return at;
      };
    };
    state.top = end(-BEAM_HALF_H);
    state.bottom = end(BEAM_HALF_H);
    states.set(r, state);
    r.play.hideBars?.([0]);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const mid = bars[0];
    start.x = mid.x - SWEEP_X;
    start.y = mid.y;
    if (ms < ARC_MS) {
      // one smooth arch from the middle onto the floor's edge
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        start.x * p,
        start.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    drawDetonation(ctx, start, ms - ARC_MS, POP_BLAST, now);
    const x = beamX(state.ends, ms);
    // the price, flaring as the beam crosses it, flipping onto its cut
    const shatter = state.flip + FLIP_MS / 2;
    const since = ms - shatter;
    if (since > 0 && since < GLOW_MS) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6 * (1 - since / GLOW_MS);
      drawGlow(ctx, GLOW_STOPS, mid.x, mid.y, GLOW, 0.6);
      ctx.restore();
    }
    const u = Math.min(1, Math.max(0, (ms - state.flip) / FLIP_MS));
    const white = x === null ? 0 : Math.max(0, 1 - Math.abs(x) / PRICE_REACH);
    ctx.save();
    ctx.translate(mid.x, mid.y);
    ctx.scale(Math.max(0.04, Math.abs(Math.cos(Math.PI * u))), 1);
    r.play.drawBar?.(ctx, 0, white);
    ctx.restore();
    if (x !== null) {
      from.x = to.x = mid.x + x;
      from.y = mid.y - BEAM_HALF_H;
      to.y = mid.y + BEAM_HALF_H;
      drawBeam(ctx, from, to, BEAM_WIDTH, 0.95);
      drawBeamFlare(ctx, from, 40, 0.8, now);
      drawBeamFlare(ctx, to, 40, 0.8, now);
    }
    const last = state.ends[PASSES - 1];
    drawWispBetween(
      ctx,
      state.top,
      ms,
      now,
      WISP_SIZE * 1.2,
      0.7,
      ARC_MS,
      last,
    );
    drawWispBetween(
      ctx,
      state.bottom,
      ms,
      now,
      WISP_SIZE * 1.2,
      0.7,
      ARC_MS,
      last,
    );
    for (let k = 0; k < state.ends.length; k++) {
      edge.x = mid.x + (k % 2 ? -SWEEP_X : SWEEP_X);
      edge.y = mid.y;
      drawDetonation(ctx, edge, ms - state.ends[k], EDGE_BLAST, now);
    }
    drawDetonation(ctx, mid, since, SHATTER_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 2.6 : 0.6),
});
