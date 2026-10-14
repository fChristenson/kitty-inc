// Crackle Cage, a lock crit: the number drops into the dark locked floor and
// a bolt of lightning arcs from wall to wall, then on to the other wall,
// zigzagging down the floor and back up, quicker and quicker, every arc left
// crackling until the floor is caught in a cage of lightning; the whole cage
// blazes, a huge bolt splits the floor across and it bursts open: its new
// bar's payouts half as big again for a while
import { CONFIG } from "../../../../config";
import { windUpBar } from "../../../rateCrits/barEffects";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/animationStyles/lightning";
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
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number dropping onto the first arc's start, shrinking away
const DROP_MS = 200;
const DROP_SHRINK = 0.3;
// the arcs: WALL_IN from the floor's sides, CEILING_IN from its top and
// bottom, ROWS rows down then back up between them, the arcs ARC_GAPS apart
// (closing), each flashing FLASH_MS then crackling at CRACKLE
const WALL_IN = 60;
const CEILING_IN = 40;
const ROWS = 5;
const ARC_GAPS: [number, number] = [230, 55];
const FORKS = 1;
const FLASH_MS = 120;
const CRACKLE = 0.45;
const CRACKLE_SCALE = 0.7;
const STRIKE_MS = 160;
const STRIKE_SHAKE: [number, number] = [0.4, 1];
// the cage blazing CAGE_GAP_MS after the last arc for BLAZE_MS, a huge bolt
// across it, then the floor opening
const CAGE_GAP_MS = 140;
const BLAZE_MS = 180;
const BLAZE_SCALE = 1.6;
const SPLIT_FORKS = 4;
const SPLIT_SCALE = 2.6;
const OPEN_GAP_MS = 120;
const PAY_GAP_MS = 400;
const OPEN_BLAST = 260;
const TAIL_MS = 900;
// shakes by step: the cage blazing (the arcs shake themselves), the
// opening, the payouts
const SHAKES = [2.2, 2.6, 1];

interface State {
  arcs: { bolt: Bolt; at: number }[];
  split: Bolt;
  blazeAt: number;
  openAt: number;
  offset: Point;
}
const states = new WeakMap<Running, State>();
const room: Point = { x: 0, y: 0 };

registerFloorCrit("crackleCageCrit", {
  // the floor it opened wound up
  reward(t) {
    windUpBar(t.floor);
    t.flipRate();
    t.punch(`${CONFIG.crit.woundUpPayout}x Pay`);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const w = (FLOOR_X_MAX - FLOOR_X_MIN) / 2 - WALL_IN;
    const h = FLOOR_H / 2 - CEILING_IN;
    // down one way, then back up offset half a row, crossing the first run
    const points: Point[] = [];
    for (let k = 0; k <= ROWS; k++)
      points.push({ x: k % 2 ? w : -w, y: lerp(-h, h, k / ROWS) });
    for (let k = 0; k < ROWS; k++)
      points.push({
        x: (ROWS + 1 + k) % 2 ? w : -w,
        y: lerp(h, -h, (k + 0.5) / ROWS),
      });
    const arcs: State["arcs"] = [];
    let t = DROP_MS;
    for (let k = 0; k < points.length - 1; k++) {
      arcs.push({ bolt: createBolt(points[k], points[k + 1], FORKS), at: t });
      t += lerp(ARC_GAPS[0], ARC_GAPS[1], k / Math.max(1, points.length - 3));
    }
    const blazeAt = arcs[arcs.length - 1].at + CAGE_GAP_MS;
    const openAt = blazeAt + BLAZE_MS + OPEN_GAP_MS;
    hit(0, blazeAt, 0);
    hit(0, openAt, 1);
    hit(0, openAt + PAY_GAP_MS, 2);
    states.set(r, {
      arcs,
      split: createBolt({ x: -w, y: 0 }, { x: w, y: 0 }, SPLIT_FORKS),
      blazeAt,
      openAt,
      offset: { x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x, y: 0 },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { arcs } = state;
    room.x = bars[0].x + state.offset.x;
    room.y = bars[0].y + state.offset.y;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      const start = arcs[0].bolt.from;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, room.x + start.x, p),
        lerp(0, room.y + start.y, p),
        r.flashFont * lerp(1, DROP_SHRINK, p),
      );
    }
    while (r.kicked < arcs.length && ms >= arcs[r.kicked].at) {
      r.shake(
        lerp(STRIKE_SHAKE[0], STRIKE_SHAKE[1], r.kicked / (arcs.length - 1)),
      );
      r.kicked++;
    }
    const blaze = clamp01((ms - state.blazeAt) / BLAZE_MS);
    const gone = ms >= state.openAt;
    ctx.save();
    ctx.translate(room.x, room.y);
    if (!gone)
      for (const arc of arcs) {
        const since = ms - arc.at;
        if (since < 0) continue;
        const flash = Math.max(0, 1 - since / FLASH_MS);
        const alpha = blaze > 0 ? 1 : CRACKLE + (1 - CRACKLE) * flash;
        const scale =
          blaze > 0
            ? lerp(1, BLAZE_SCALE, blaze)
            : CRACKLE_SCALE + (1 - CRACKLE_SCALE) * flash;
        drawBolt(ctx, arc.bolt, alpha, scale);
        if (since < STRIKE_MS)
          drawStrike(ctx, arc.bolt.to, 1 - since / STRIKE_MS, 1, now);
      }
    if (blaze > 0 && ms < state.openAt + STRIKE_MS)
      drawBolt(
        ctx,
        state.split,
        1 - clamp01((ms - state.openAt) / STRIKE_MS),
        SPLIT_SCALE,
      );
    ctx.restore();
    drawDetonation(ctx, room, ms - state.openAt, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
