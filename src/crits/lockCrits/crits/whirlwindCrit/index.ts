// Whirlwind, a lock crit: a tornado of glitter drops out of the sky onto the
// dark locked floor and tears across it, the glitter strewn over the room
// quivering as it nears, then ripped up and spun round the funnel; it swings
// back onto the lock and parks there, spinning up to a blur, every lap a
// jolt and a pop on the lock, trembling harder; the lock bursts in the
// biggest blast and the funnel flings everything it caught onto the opened
// floor's bar: it starts spinning fast, winding down
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import {
  drawTornado,
  flingFrom,
  liftAt,
  planTornado,
  tornadoTurn,
  type Tornado,
} from "../../../../shared/animationStyles/tornado";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import { WORKER_FEET_Y } from "../../../../floors/worker";
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
// the funnel dropping SKY px onto the floor over DROP_MS, then tearing out
// to one side (OUT_MS), across (ACROSS_MS) and back onto the lock (BACK_MS),
// WALL_IN px in from the walls, parking there PARK_MS, trembling up to SHIVER
const SKY = 1100;
const DROP_MS = 180;
const OUT_MS = 130;
const ACROSS_MS = 220;
const BACK_MS = 130;
const WALL_IN = 70;
const PARK_MS = 560;
const SHIVER = 22;
const HEIGHT = 560;
const FOOT = 30;
const TOP = 200;
const SPIN_HZ: [number, number] = [1, 6];
const COLLAPSE_MS = 220;
// the glitter: SPECKS strewn over the room, quivering up to QUIVER px once
// the foot is within NEAR px
const SPECKS = 48;
const SPECK = 20;
const QUIVER = 18;
const NEAR = 380;
// flung onto the bar over FLING_MS, STAGGER_MS apart, across BAR_SPREAD of it
const FLING_MS = 240;
const STAGGER_MS = 3;
const BAR_SPREAD = 0.8;
const LAP_POP = 110;
const OPEN_BLAST = 440;
const BAR_BLAST = 240;
// shakes by step: a lap, the floor bursting open, onto its bar
const SHAKES = [0.7, 3.2, 1.4];

interface Speck {
  x: number;
  y: number;
  caughtMs: number;
  seed: number;
  to: Point;
  flungMs: number;
}
interface State {
  tornado: Tornado;
  specks: Speck[];
  laps: number[];
  openAt: number;
  landAt: number;
  bar: Point;
  foot: Point;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// a bar spinning: from `from` it runs speed times as fast, winding down to
// normal by `until`
const spins = defineBarEffect<{ from: number; until: number }>({
  speed: (s, now) =>
    1 +
    (meta.values.speed - 1) *
      (1 - clamp01((now - s.from) / (s.until - s.from))),
  ended: (s, now) => now >= s.until,
});

registerFloorCrit("whirlwindCrit", {
  reward(t) {
    t.flipRate();
    spins.set(t.floor, { from: t.now, until: t.now + meta.values.ms });
    t.punch(`x${meta.values.speed} Spin`);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const left = FLOOR_X_MIN + WALL_IN - lock.x;
    const right = FLOOR_X_MAX - WALL_IN - lock.x;
    const ground = WORKER_FEET_Y - lock.y;
    const landed = IN_MS + DROP_MS;
    const outEnd = landed + OUT_MS;
    const acrossEnd = outEnd + ACROSS_MS;
    const parkAt = acrossEnd + BACK_MS;
    const openAt = parkAt + PARK_MS;
    const footAt = (ms: number, into: Point): Point => {
      into.y = ground;
      if (ms < landed) {
        into.x = 0;
        into.y = ground - SKY * (1 - clamp01((ms - IN_MS) / DROP_MS)) ** 2;
      } else if (ms < outEnd) into.x = lerp(0, left, (ms - landed) / OUT_MS);
      else if (ms < acrossEnd)
        into.x = lerp(left, right, (ms - outEnd) / ACROSS_MS);
      else if (ms < parkAt) into.x = lerp(right, 0, (ms - acrossEnd) / BACK_MS);
      else {
        const shiver = SHIVER * clamp01((ms - parkAt) / PARK_MS) ** 2;
        into.x = Math.sin(ms * 0.9) * shiver;
        into.y += Math.cos(ms * 1.3) * shiver * 0.3;
      }
      return into;
    };
    const tornado = planTornado(footAt, {
      startMs: IN_MS,
      endMs: openAt,
      height: HEIGHT,
      foot: FOOT,
      top: TOP,
      spinHz: SPIN_HZ,
      growMs: 160,
    });
    // a jolt and a pop at every lap while it's parked on the lock
    const laps: number[] = [];
    let lap = Math.floor(tornadoTurn(tornado, parkAt) / (Math.PI * 2));
    for (let ms = parkAt; ms < openAt; ms += 4) {
      const now = Math.floor(tornadoTurn(tornado, ms) / (Math.PI * 2));
      if (now > lap) {
        laps.push(ms);
        hit(0, ms, 0);
        lap = now;
      }
    }
    hit(0, openAt, 1);
    const box = getIncomeBarBox(false);
    const bar: Point = {
      x: box.x + box.width / 2 - lock.x,
      y: box.y + box.height / 2 - lock.y,
    };
    const specks: Speck[] = [];
    for (let i = 0; i < SPECKS; i++) {
      const x = lerp(left, right, (i + holeHash(i, 4120)) / SPECKS);
      specks.push({
        x,
        y: ground - holeHash(i, 4121) * 50,
        caughtMs:
          x < 0
            ? landed + OUT_MS * (x / left)
            : outEnd + ACROSS_MS * ((x - left) / (right - left)),
        seed: holeHash(i, 4122),
        to: {
          x: bar.x + (holeHash(i, 4123) - 0.5) * box.width * BAR_SPREAD,
          y: bar.y,
        },
        flungMs: openAt + i * STAGGER_MS,
      });
    }
    const landAt = openAt + (SPECKS - 1) * STAGGER_MS + FLING_MS;
    hit(0, landAt, 2);
    states.set(r, {
      tornado,
      specks,
      laps,
      openAt,
      landAt,
      bar,
      foot: { x: 0, y: 0 },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { tornado, specks, openAt } = state;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.6 * p), {
        alpha: 1 - p,
      });
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms < openAt + COLLAPSE_MS)
      drawTornado(
        ctx,
        tornado,
        Math.min(ms, openAt),
        1 - Math.max(0, ms - openAt) / COLLAPSE_MS,
      );
    const foot = tornado.at(Math.min(ms, openAt), state.foot);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < specks.length; i++) {
      const s = specks[i];
      const lands = s.flungMs + FLING_MS;
      if (ms < IN_MS || ms >= lands) continue;
      if (ms < s.caughtMs) {
        // quivering, then lifting, as the funnel nears
        const near = clamp01(1 - Math.abs(foot.x - s.x) / NEAR);
        spot.x = s.x + Math.sin(ms * 0.05 + i) * QUIVER * near;
        spot.y =
          s.y -
          Math.abs(Math.cos(ms * 0.04 + i * 1.7)) * QUIVER * 2 * near * near;
      } else if (ms < s.flungMs) {
        liftAt(tornado, Math.min(ms, openAt), s.caughtMs, s.seed, spot);
      } else {
        flingFrom(
          tornado,
          s.flungMs,
          s.caughtMs,
          s.seed,
          s.to,
          (ms - s.flungMs) / FLING_MS,
          spot,
        );
      }
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (let k = 0; k < state.laps.length; k++)
      drawDetonation(
        ctx,
        ORIGIN,
        ms - state.laps[k],
        LAP_POP * (1 + k * 0.15),
        now,
      );
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    drawDetonation(ctx, state.bar, ms - state.landAt, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
