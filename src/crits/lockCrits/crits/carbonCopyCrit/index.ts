// Carbon Copy, a lock crit: the number arcs onto the bar of the floor below
// the locked one and turns into a wisp racing along it, lighting it end to
// end; a gold copy of the bar lifts off behind it and the wisp hauls it up
// into the locked floor, slamming it in: the floor opens, then climbs to the
// whole level of the one below
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { FLOOR_H } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const ARC_MS = 200;
const ARC_RISE = 140;
const ARRIVE_BLAST = 90;
// along the bar below, end to end, glitter trailing the wisp
const TRACE_MS = 520;
const TRAIL = 16;
const TRAIL_STEP = 34;
const TRAIL_SPREAD = 60;
const GLITTER = 40;
// the copy lifting off, hauled up a floor
const LIFT_GAP_MS = 100;
const LIFT_MS = 300;
const COPY_ALPHA = 0.85;
const COPY_GLOW = 1.4;
const SLAM_BLAST = 280;
const LEVELS_GAP_MS = 150;
const LEVELS_BLAST = 160;
const WISP = WISP_SIZE * 1.5;
const TAIL_MS = 900;

interface State {
  bars: Point[];
  // the opened floor's bar from the lock's middle, and its box
  bar: Point;
  box: { width: number; height: number; radius: number };
  arrive: number;
  lift: number;
  slam: number;
  levels: number;
  wisp: (ms: number) => Point | null;
}

const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("carbonCopyCrit", {
  // up from a free floor's share to the whole level of the one below
  reward(t) {
    const below = t.floors[t.floors.indexOf(t.floor) - 1];
    t.levelUp(below ? below.upgradeCount - t.floor.upgradeCount : 0);
  },
  plan(r, bars, hit) {
    const box = getIncomeBarBox(false);
    const lock = getLockCenter();
    const bar = {
      x: box.x + box.width / 2 - lock.x,
      y: box.y + box.height / 2 - lock.y,
    };
    const arrive = ARC_MS;
    const lift = arrive + TRACE_MS + LIFT_GAP_MS;
    const slam = lift + LIFT_MS;
    const levels = slam + LEVELS_GAP_MS;
    hit(0, arrive, 0);
    hit(0, slam, 1);
    hit(0, levels, 2);
    const state: State = {
      bars,
      bar,
      box,
      arrive,
      lift,
      slam,
      levels,
      wisp: () => null,
    };
    const half = box.width / 2 - 30;
    const at: Point = { x: 0, y: 0 };
    // along the bar below, then up a floor with the copy
    state.wisp = (ms) => {
      if (ms < arrive || ms > slam) return null;
      const mid = state.bars[0];
      const y = mid.y + bar.y + FLOOR_H;
      if (ms < lift) {
        const u = clamp01((ms - arrive) / TRACE_MS);
        const p = u * u * (3 - 2 * u);
        at.x = mid.x + bar.x + lerp(-half, half, p);
        at.y = y;
        return at;
      }
      at.x = mid.x + bar.x + half;
      at.y = y - FLOOR_H * clamp01((ms - lift) / LIFT_MS) ** 2;
      return at;
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const { bar, box } = state;
    const mid = bars[0];
    const belowY = mid.y + bar.y + FLOOR_H;
    const left = mid.x + bar.x - box.width / 2 + 30;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        left * p,
        belowY * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    spot.x = left;
    spot.y = belowY;
    drawDetonation(ctx, spot, ms - state.arrive, ARRIVE_BLAST, now);
    // glitter lighting the bar below behind the wisp
    if (ms >= state.arrive && ms < state.lift) {
      const head = state.wisp(ms)!;
      const hx = head.x;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < TRAIL; i++) {
        const x = hx - i * TRAIL_STEP - holeHash(i, 61) * 20;
        if (x < left) break;
        stampGlimmer(
          ctx,
          x,
          belowY + (holeHash(i, 62) - 0.5) * TRAIL_SPREAD,
          GLITTER * (1 - i / TRAIL),
          i,
          COLOR.heavenlyGold,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    // the gold copy, lifting up a floor
    if (ms >= state.lift && ms < state.slam) {
      const y = belowY - FLOOR_H * clamp01((ms - state.lift) / LIFT_MS) ** 2;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      drawGlow(ctx, GOLD, mid.x + bar.x, y, box.width * 0.5 * COPY_GLOW, 0.3);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = COPY_ALPHA;
      ctx.fillStyle = COLOR.heavenlyGold;
      ctx.beginPath();
      ctx.roundRect(
        mid.x + bar.x - box.width / 2,
        y - box.height / 2,
        box.width,
        box.height,
        box.radius,
      );
      ctx.fill();
      ctx.restore();
    }
    drawWisp(ctx, state.wisp, ms, now, WISP, 0.8);
    drawDetonation(ctx, mid, ms - state.slam, SLAM_BLAST, now);
    spot.x = mid.x + bar.x;
    spot.y = mid.y + bar.y;
    drawDetonation(ctx, spot, ms - state.levels, LEVELS_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 3 : step === 2 ? 1.6 : 0.8),
});
