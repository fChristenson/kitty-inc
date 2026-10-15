// Star Crash, a lock crit: the number bursts into two spiral galaxies of
// glitter at either end of the dark locked floor, spinning opposite ways;
// they drift together, then race in, spinning faster and faster, their arms
// winding tight, flashes going off in their cores closer and closer; they
// smash into each other dead on the lock in the biggest blast, bursting the
// floor open, and every star is flung off along its orbit and curves down
// onto the new floor's bar with its levels
import meta from "./meta";
import {
  drawStars,
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
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
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const BURST_MS = 120;
// the galaxies: STARS each OUTER px round, starting START of the way out to
// the walls, racing in over APPROACH_MS (accelerating as u^RUSH), their
// clocks running SPIN_UP times faster by the crash
const STARS = 70;
const INNER = 20;
const OUTER = 170;
const START = 0.6;
const APPROACH_MS = 1150;
const RUSH = 2.6;
const SPIN_UP = 4;
const STAR = 18;
// the flashes in their cores at these shares of the approach
const FLASHES = [0.35, 0.55, 0.7, 0.8, 0.88, 0.94];
const FLASH = 110;
// after the crash: each star flung FLING px along its orbit over FLING_MS,
// then curving onto the bar over FALL_MS (STAGGER_MS apart)
const FLING = 220;
const FLING_MS = 90;
const FALL_MS = 200;
const STAGGER_MS = 1;
const CRASH_BLAST = 460;
const BAR_BLAST = 240;
// shakes by step: a flash, the crash, onto the bar
const SHAKES = [0.6, 3.2, 1.4];

interface Galaxy {
  disk: Disk;
  stars: Orbit[];
  // where it starts, from the lock
  from: number;
}
interface State {
  galaxies: Galaxy[];
  flashes: number[];
  crashAt: number;
  landAt: number;
  // each star's spot at the crash, its heading, and its spot on the bar
  spots: Point[];
  headings: Float32Array;
  targets: Point[];
  bar: Point;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const star: Point = { x: 0, y: 0 };

// the galaxies' clock at ms: running faster and faster as they close in
function clock(ms: number): number {
  const s = Math.max(0, ms - BURST_MS);
  return s + ((SPIN_UP - 1) * s * s) / (2 * APPROACH_MS);
}

registerFloorCrit("starCrashCrit", {
  reward(t) {
    t.levelUp(t.count * meta.values.levels);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const walls = [FLOOR_X_MIN - lock.x, FLOOR_X_MAX - lock.x];
    const galaxies: Galaxy[] = walls.map((wall, k) => {
      const disk = planDisk(
        { x: wall * START, y: 0 },
        {
          inner: INNER,
          outer: OUTER,
          squash: 0.5,
          tilt: k ? 0.3 : -0.3,
          rimHz: 0.8,
          spin: k ? -1 : 1,
        },
      );
      return {
        disk,
        stars: scatterArms(disk, STARS, 2, 0.7, 0.3),
        from: wall * START,
      };
    });
    const flashes = FLASHES.map((share) => BURST_MS + APPROACH_MS * share);
    for (const at of flashes) hit(0, at, 0);
    const crashAt = BURST_MS + APPROACH_MS;
    hit(0, crashAt, 1);
    // where every star is at the crash, both galaxies on the lock
    const spots: Point[] = [];
    const headings: number[] = [];
    const crashClock = clock(crashAt);
    for (const g of galaxies) {
      g.disk.center.x = 0;
      for (const o of g.stars) {
        spots.push(g.disk.at(o, crashClock, { x: 0, y: 0 }));
        headings.push(g.disk.heading(o, crashClock));
      }
      g.disk.center.x = g.from;
    }
    const box = getIncomeBarBox(false);
    const bar = {
      x: box.x + box.width / 2 - lock.x,
      y: box.y + box.height / 2 - lock.y,
    };
    const n = spots.length;
    const landAt = crashAt + FLING_MS + (n - 1) * STAGGER_MS + FALL_MS;
    hit(0, landAt, 2);
    states.set(r, {
      galaxies,
      flashes,
      crashAt,
      landAt,
      spots,
      headings: Float32Array.from(headings),
      targets: spots.map((_, i) => ({
        x: bar.x + (holeHash(i, 6910) * 2 - 1) * box.width * 0.45,
        y: bar.y + (holeHash(i, 6911) - 0.5) * box.height,
      })),
      bar,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { galaxies, flashes, crashAt, spots, headings, targets } = state;
    if (ms < BURST_MS) {
      const p = ms / BURST_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p,
        r.flashFont * (1 - 0.6 * p),
      );
      return;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms < crashAt) {
      const u = clamp01((ms - BURST_MS) / APPROACH_MS);
      const grow = clamp01((ms - BURST_MS) / 160);
      const t = clock(ms);
      for (const g of galaxies) {
        g.disk.center.x = g.from * (1 - u ** RUSH);
        drawStars(ctx, g.disk, g.stars, t, STAR, grow);
        for (let k = 0; k < flashes.length; k++)
          drawDetonation(ctx, g.disk.center, ms - flashes[k], FLASH, now);
      }
    } else {
      // every star flung off along its orbit, then curving onto the bar
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < spots.length; i++) {
        const since = ms - crashAt;
        const fling = clamp01(since / FLING_MS);
        const out = FLING * (1 - (1 - fling) ** 2);
        const fx = spots[i].x + Math.cos(headings[i]) * out;
        const fy = spots[i].y + Math.sin(headings[i]) * out;
        const fall = clamp01((since - FLING_MS - i * STAGGER_MS) / FALL_MS);
        if (fall >= 1) continue;
        const e = fall * fall;
        star.x = lerp(fx, targets[i].x, e);
        star.y = lerp(fy, targets[i].y, e);
        stampGlimmer(
          ctx,
          star.x,
          star.y,
          STAR * 1.2,
          i,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, ORIGIN, ms - crashAt, CRASH_BLAST, now);
    drawDetonation(ctx, state.bar, ms - state.landAt, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
