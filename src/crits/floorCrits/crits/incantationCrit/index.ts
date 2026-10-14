// Incantation, a floor crit: the number shrinks into a pen of light that
// races down the building, drawing a magic circle on the ground of every
// floor in view in one stroke each, quicker each, every circle its own look;
// each starts turning the moment it's drawn, slow then whipping round, a
// jolt at every turn of its own; then they erupt back up the building in a
// quick ripple, a pillar of light and levels through every bar, its own last
// and biggest
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getIncomeBarCenter } from "../../../../floors/incomePanel";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../critPlayer";

const IN_MS = 160;
// the pen: a circle's rim in RIM_MS (the summon's own), then HOP_MS (quicker
// each) on to the next circle down
const RIM_MS = 240;
const HOP_MS: [number, number] = [110, 50];
// the circles: RADIUS of the floor's width (its own OWN_RADIUS), turning
// TURNS times, erupting SPIN_MS after the last is drawn, back up the
// building RIPPLE_MS apart, its own OWN_GAP_MS after the rest
const RADIUS = 0.25;
const OWN_RADIUS = 0.34;
const TURNS = 6;
const SPIN_MS = 700;
const RIPPLE_MS = 70;
const OWN_GAP_MS = 140;
const PILLAR = 1.15;
const PEN = WISP_SIZE * 0.9;
const BLAST = 170;
const OWN_BLAST = 340;
const SQUASH = 0.3;
// shakes by step: a turn, a floor's eruption, its own
const SHAKES = [0.4, 1.2, 3];

interface State {
  bars: Point[];
  // each bar's circle
  summons: Summon[];
  // the circle's middle from its bar's
  offset: Point;
  radii: number[];
  penEnd: number;
  pen: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };

registerFloorCrit("incantationCrit", {
  // the turns only jolt; the eruption levels every floor
  levels: (count, step) => (step ? count : 0),
  plan(r, bars, hit) {
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    const centre = getIncomeBarCenter(false);
    const offset = {
      x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - centre.x,
      y: WORKER_FEET_Y - centre.y,
    };
    // drawn top to bottom
    const order = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const starts: number[] = [];
    let t = IN_MS;
    order.forEach((_, k) => {
      starts.push(t);
      t +=
        RIM_MS + lerp(HOP_MS[0], HOP_MS[1], k / Math.max(1, order.length - 1));
    });
    const drawn = starts[starts.length - 1] + RIM_MS;
    const rippleFrom = drawn + SPIN_MS;
    // erupting from the bottom up, its own last
    const up = [...order].reverse().filter((bar) => bar !== 0);
    const erupts: number[] = [];
    up.forEach((bar, k) => (erupts[bar] = rippleFrom + k * RIPPLE_MS));
    erupts[0] =
      rippleFrom + Math.max(0, up.length - 1) * RIPPLE_MS + OWN_GAP_MS;
    const summons: Summon[] = [];
    const radii: number[] = [];
    order.forEach((bar, k) => {
      summons[bar] = planSummon(
        starts[k],
        erupts[bar],
        TURNS,
        summonLook(k + 3),
      );
      radii[bar] = width * (bar === 0 ? OWN_RADIUS : RADIUS);
      hit(bar, erupts[bar], bar === 0 ? 2 : 1);
    });
    for (const rev of summons[0].revs) hit(0, rev, 0);
    const spot: Point = { x: 0, y: 0 };
    const state: State = {
      bars,
      summons,
      offset,
      radii,
      penEnd: drawn,
      pen: (ms) => {
        if (ms < IN_MS || ms > drawn) return null;
        let k = 0;
        while (k < order.length - 1 && ms >= starts[k + 1]) k++;
        const bar = order[k];
        const b = state.bars[bar];
        const u = (ms - starts[k]) / RIM_MS;
        if (u <= 1 || k === order.length - 1) {
          // round the rim, as the circle's own pen draws it
          const a = Math.PI * 2 * Math.min(1, u);
          spot.x = b.x + offset.x + Math.cos(a) * radii[bar];
          spot.y = b.y + offset.y + Math.sin(a) * radii[bar] * SQUASH;
          return spot;
        }
        // hopping down to the next circle's start
        const next = order[k + 1];
        const nb = state.bars[next];
        const h =
          (ms - starts[k] - RIM_MS) / (starts[k + 1] - starts[k] - RIM_MS);
        spot.x = lerp(
          b.x + offset.x + radii[bar],
          nb.x + offset.x + radii[next],
          h,
        );
        spot.y = lerp(b.y, nb.y, h) + offset.y - 160 * 4 * h * (1 - h);
        return spot;
      },
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - (0.6 * ms) / IN_MS),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    for (let i = 0; i < bars.length; i++) {
      const summon = state.summons[i];
      const radius = state.radii[i];
      at.x = bars[i].x + state.offset.x;
      at.y = bars[i].y + state.offset.y;
      drawSummon(ctx, summon, ms, at, radius);
      drawSummonPillar(ctx, summon, ms, at, radius, FLOOR_H * PILLAR);
      drawDetonation(
        ctx,
        bars[i],
        ms - summon.eruptMs,
        i === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
    drawWispBetween(ctx, state.pen, ms, now, PEN, 1, IN_MS, state.penEnd);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
