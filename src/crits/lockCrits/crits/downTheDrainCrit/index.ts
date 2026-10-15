// Down the Drain, a lock crit: the number slams onto the dark locked floor's
// lock and blows apart into glitter strewn all over the room; the lock opens
// into a black hole in a gold rim and the mess starts to swirl round it,
// slowly at first, then faster and faster, spiralling in, the hole gulping
// harder and swelling with every speck it swallows; it takes the last,
// collapses to a point and the floor bursts open, a wisp shooting out onto
// its button: each of its next taps also pays out the floor below it
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import {
  drawGravityHole,
  flingOut,
  scatterEvenly,
  simulateClean,
  type Swept,
} from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { BTN_H, BTN_W, BTN_X, getBtnY } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const ARC_MS = 150;
const ARC_RISE = 120;
// the mess: BITS over the room WALL_IN px in from its walls and ROOM of the
// floor's height round the lock, flung out over FLING_MS
const BITS = 110;
const WALL_IN = 40;
const ROOM = 0.35;
const FLING_MS = 180;
const SPECK = 20;
// the drain: swirling for SWIRL_MS, its pull rising PULL[0]..PULL[1] and
// the swirl SPIN, catching within CORE px; the hole HOLE[0]..HOLE[1] across
const SWIRL_MS = 1100;
const PULL: [number, number] = [0.012, 0.16];
const SPIN = 1.4;
const CORE = 40;
const HOLE: [number, number] = [70, 210];
const COLLAPSE_MS = 90;
// the wisp onto the button over WISP_MS
const WISP_MS = 150;
const SLAM_BLAST = 140;
const OPEN_BLAST = 440;
const BUTTON_BLAST = 220;
// shakes by step: -, the floor bursting open, onto its button
const SHAKES = [0.5, 3, 1.3];

interface State {
  spots: Point[];
  swept: Swept;
  start: number;
  openAt: number;
  landAt: number;
  button: Point;
  wisp: (ms: number) => Point;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };

// each tap also paying out the floor below
const drainTaps = defineTapPerk("Drain", (t) => {
  const below = t.floors[t.floors.indexOf(t.floor) - 1];
  if (below?.unlocked) t.payout(below, 1);
});

registerFloorCrit("downTheDrainCrit", {
  reward(t) {
    drainTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const spots = scatterEvenly(
      {
        left: FLOOR_X_MIN + WALL_IN - lock.x,
        right: FLOOR_X_MAX - WALL_IN - lock.x,
        top: -FLOOR_H * ROOM,
        bottom: FLOOR_H * ROOM,
      },
      BITS,
    );
    const start = ARC_MS + FLING_MS;
    const end = start + SWIRL_MS;
    const swept = simulateClean(
      spots,
      [
        {
          kind: "hole",
          at: (_ms, into) => {
            into.x = 0;
            into.y = 0;
            return into;
          },
          pull: (ms) =>
            lerp(PULL[0], PULL[1], clamp01((ms - start) / SWIRL_MS) ** 2),
          core: CORE,
          swirl: SPIN,
        },
      ],
      start,
      end,
    );
    const openAt = end + COLLAPSE_MS;
    hit(0, ARC_MS, 0);
    hit(0, openAt, 1);
    const button: Point = {
      x: BTN_X + BTN_W / 2 - lock.x,
      y: getBtnY(false) + BTN_H / 2 - lock.y,
    };
    const landAt = openAt + WISP_MS;
    hit(0, landAt, 2);
    const at: Point = { x: 0, y: 0 };
    states.set(r, {
      spots,
      swept,
      start,
      openAt,
      landAt,
      button,
      wisp: (ms) => {
        const u = clamp01((ms - openAt) / WISP_MS) ** 2;
        at.x = button.x * u;
        at.y = button.y * u - 160 * 4 * u * (1 - u);
        return at;
      },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { spots, swept, start, openAt } = state;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.5 * p),
      );
      return;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const end = openAt - COLLAPSE_MS;
    const collapse = clamp01((ms - end) / COLLAPSE_MS) ** 2;
    if (ms >= start && ms < openAt) {
      const c = clamp01((ms - start) / SWIRL_MS);
      drawGravityHole(
        ctx,
        ORIGIN,
        lerp(HOLE[0], HOLE[1], c) * (1 - collapse),
        1,
        ms,
        now,
      );
    }
    if (ms < openAt) {
      const flung = (ms - ARC_MS) / FLING_MS;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < spots.length; i++) {
        if (flung < 1)
          flingOut(ORIGIN, spots[i], holeHash(i, 5810), flung, bit);
        else {
          swept.at(i, ms, bit);
          bit.x *= 1 - collapse;
          bit.y *= 1 - collapse;
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
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, ORIGIN, ms - ARC_MS, SLAM_BLAST, now);
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    drawWispBetween(
      ctx,
      state.wisp,
      ms,
      now,
      WISP_SIZE * 1.3,
      1,
      openAt,
      state.landAt,
    );
    drawDetonation(ctx, state.button, ms - state.landAt, BUTTON_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
