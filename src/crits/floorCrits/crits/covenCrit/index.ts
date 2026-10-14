// Coven, a floor crit: pens of light draw a magic circle on the ground of
// every floor in view at once, then their inner rings and marks; the circles
// turn together, each floor's the other way to the one above, slow then
// whipping round, a jolt every turn, glitter rising quicker; then they erupt
// in one quick ripple down the building, a pillar of light through every
// bar, its own last and biggest
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
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
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
const ERUPT_MS = IN_MS + 1250;
// each floor's eruption this long after the one above it, its own last
const ERUPT_GAP_MS = 40;
const TURNS = 7;
// each circle RADIUS of its floor's width across, its own OWN_RADIUS
const RADIUS = 0.27;
const OWN_RADIUS = 0.34;
const PILLAR = 1.15;
const BLAST = 170;
const OWN_BLAST = 320;
const TAIL_MS = 900;
// shakes by step: a turn, a floor's eruption, its own
const SHAKES = [0.5, 1.2, 3];

interface State {
  // each bar's circle
  summons: Summon[];
  // the circle's middle from its bar's
  offset: Point;
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };

registerFloorCrit("covenCrit", {
  // the turns only jolt; the eruption levels every floor
  levels: (count, step) => (step ? count : 0),
  plan(r, bars, hit) {
    const summons: Summon[] = [];
    ownLast(bars).forEach((bar, k) => {
      summons[bar] = planSummon(
        IN_MS,
        ERUPT_MS + k * ERUPT_GAP_MS,
        TURNS,
        summonLook(k + 1),
      );
      hit(bar, summons[bar].eruptMs, bar === 0 ? 2 : 1);
    });
    const bar = getIncomeBarCenter(false);
    states.set(r, {
      summons,
      offset: {
        x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - bar.x,
        y: WORKER_FEET_Y - bar.y,
      },
    });
    for (const rev of summons[0].revs) hit(0, rev, 0);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    for (let i = 0; i < bars.length; i++) {
      const own = i === 0;
      const summon = state.summons[i];
      const radius = width * (own ? OWN_RADIUS : RADIUS);
      at.x = bars[i].x + state.offset.x;
      at.y = bars[i].y + state.offset.y;
      // every other floor's turns the other way
      ctx.save();
      if (i % 2) {
        ctx.translate(at.x * 2, 0);
        ctx.scale(-1, 1);
      }
      drawSummon(ctx, summon, ms, at, radius);
      ctx.restore();
      drawSummonPillar(ctx, summon, ms, at, radius, FLOOR_H * PILLAR);
      drawDetonation(
        ctx,
        bars[i],
        ms - summon.eruptMs,
        own ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
