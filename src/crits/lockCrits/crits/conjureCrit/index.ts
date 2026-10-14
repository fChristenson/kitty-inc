// Conjure, a lock crit: the number lands on the dark locked floor's ground,
// where a pen of light draws a magic circle in one stroke, then its inner
// ring and a star of marks; the rings turn against each other quicker and
// quicker, a jolt every turn, glitter rising off them, until a pillar of
// light erupts out of it: the floor opens free and its price pays back
import { CONFIG } from "../../../../config";
import { multiply } from "../../../../shared/bigNumber";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../../floorCrits/critPlayer";

// the number arcing down onto the circle's middle
const ARC_MS = 180;
const ARC_RISE = 120;
const ARRIVE_BLAST = 90;
// the circle: on the floor's ground GROUND of its height under its middle,
// RADIUS of its width across
const GROUND = 0.3;
const RADIUS = 0.34;
const ERUPT_MS = ARC_MS + 1150;
const TURNS = 7;
// the pillar up past the floor's top, the eruption's blast, then the price
// paid back
const PILLAR = 1.2;
const ERUPT_BLAST = 280;
const PAY_MS = ERUPT_MS + 250;
const TAIL_MS = 900;
// shakes by step: a turn, the eruption, the price back
const SHAKES = [0.6, 2.6, 1];

interface State {
  summon: Summon;
  // the circle's middle from the lock's, its radius
  offset: Point;
  radius: number;
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };

registerFloorCrit("conjureCrit", {
  // the price of the floor it opened, back
  reward(t) {
    if (!t.price) return;
    t.pay(multiply(t.price, CONFIG.crit.conjurePriceBack));
    t.punch("Price Back");
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const summon = planSummon(ARC_MS, ERUPT_MS, TURNS);
    states.set(r, {
      summon,
      offset: {
        x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x,
        y: FLOOR_H * GROUND,
      },
      radius: (FLOOR_X_MAX - FLOOR_X_MIN) * RADIUS,
    });
    hit(0, ARC_MS, 0);
    for (const rev of summon.revs) hit(0, rev, 0);
    hit(0, ERUPT_MS, 1);
    hit(0, PAY_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    at.x = bars[0].x + state.offset.x;
    at.y = bars[0].y + state.offset.y;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        at.x * p,
        at.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    drawDetonation(ctx, at, ms - ARC_MS, ARRIVE_BLAST, now);
    drawSummon(ctx, state.summon, ms, at, state.radius);
    drawSummonPillar(ctx, state.summon, ms, at, state.radius, FLOOR_H * PILLAR);
    drawDetonation(ctx, at, ms - ERUPT_MS, ERUPT_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
