// Back Door, a lock crit: a gold ring opens over the bar of the floor below
// the dark locked one, its twin right inside the locked floor over the lock;
// the number drops over the lower ring and bursts into two wisps that dive
// in and burst out of the twin at once, keeping their speed, slamming into
// the lock from the inside (a flash and a jolt each), looping back round
// and diving again, every slam knocking another wisp loose, every pass
// quicker, the rings flaring and growing; then all of them dive at once and
// the lock bursts open, and they stream out onto the new floor's bar in a
// final blast: its next payouts each also pay out the floor below it
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import type { Floor } from "../../../../gameState";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  portalLook,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { addTotalIncome } from "../../../../totalIncome";
import { playSwoosh } from "../../../../sound";
import { FLOOR_H } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  currentPayoutAmount,
  getIncomeBarBox,
  punchIncomeBar,
} from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing over the lower ring, DROP_UP px above it, bursting into
// the first wisps that fall in over DROP_MS
const IN_MS = 170;
const ARC_RISE = 120;
const DROP_UP = 260;
const DROP_MS = 130;
// the lower ring A_OVER px over the bar below, the twin B_UP px over the lock;
// RING_A/RING_B px round, growing as the passes go, flaring FLARE at each
const A_OVER = 150;
const B_UP = 230;
const RING_A: [number, number] = [80, 140];
const RING_B: [number, number] = [80, 150];
const FLARE = 0.35;
const FLARE_MS = 150;
const OPEN_MS = 120;
const CLOSE_MS = 100;
// the waves: COUNTS wisps each, STAGGER_MS apart, CYCLE_MS from one wave's
// dive to the next (quickening); out of the twin into the lock in SLAM_MS,
// looping back bowed BOW px to one side; the last wave all at once
const COUNTS = [2, 3, 4, 5, 7];
const STAGGER_MS = [45, 35, 25, 12, 0];
const CYCLE_MS = [340, 290, 250, 215];
const SLAM_MS = 65;
const BOW = 240;
// the lock bursting, a HOLD_MS breath, then the wisps streaming STREAM_STEP_MS
// apart onto the new bar over STREAM_MS, SPREAD of its width either side
const HOLD_MS = 80;
const STREAM_MS = 150;
const STREAM_STEP_MS = 22;
const SPREAD = 0.38;
const WISP = WISP_SIZE * 1.1;
const BURST_BLAST = 140;
const SLAM_BLAST = 110;
const OPEN_BLAST = 420;
const LAND_BLAST = 110;
const BAR_BLAST = 260;
// shakes by step: a slam, the lock bursting, onto the new bar
const SHAKES = [0.7, 3, 1.4];

interface Runner {
  at: (ms: number) => Point | null;
  startMs: number;
  endMs: number;
}
interface State {
  // from the lock's middle
  ringA: Point;
  ringB: Point;
  drop: Point;
  runners: Runner[];
  // every dive, every slam, and each wave's first dive
  passes: number[];
  slams: number[];
  waves: number[];
  firstDive: number;
  lastDive: number;
  openAt: number;
  lands: number[];
  spots: Point[];
  barMid: Point;
  firstLand: number;
}
const states = new WeakMap<Running, State>();
const LOCK: Point = { x: 0, y: 0 };

// the opened floor's next `left` payouts each also paying out `below`
const backDoors = defineBarEffect<{
  below: Floor;
  left: number;
  color: string;
}>({
  onPayout: (v, now) => {
    if (v.below.unlocked) {
      addTotalIncome(currentPayoutAmount(v.below, now));
      punchIncomeBar(v.below, null, v.color);
      pulseHudTotalFlash();
    }
    v.left--;
    return v.left > 0 ? v : undefined;
  },
});

registerFloorCrit("backDoorCrit", {
  reward(t) {
    const below = t.floors[t.floors.indexOf(t.floor) - 1];
    if (!below?.unlocked) return;
    const { payouts } = meta.values;
    const left = (backDoors.get(t.floor)?.left ?? 0) + payouts;
    backDoors.set(t.floor, { below, left, color: t.color });
    t.punch(`Back Door x${payouts}`);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const box = getIncomeBarBox(false);
    const barX = box.x + box.width / 2 - lock.x;
    const barY = box.y + box.height / 2 - lock.y;
    const ringA = { x: barX, y: barY + FLOOR_H - A_OVER };
    const ringB = { x: 0, y: -B_UP };
    const drop = { x: ringA.x, y: ringA.y - DROP_UP };
    const last = COUNTS.length - 1;
    // each wave's dives, by wisp
    const dives: number[][] = [];
    const waves: number[] = [];
    let d = IN_MS + DROP_MS;
    for (let k = 0; k <= last; k++) {
      waves.push(d);
      const wave: number[] = [];
      for (let j = 0; j < COUNTS[k]; j++) wave.push(d + j * STAGGER_MS[k]);
      dives.push(wave);
      d += CYCLE_MS[k] ?? 0;
    }
    const lastDive = waves[last];
    const openAt = lastDive + SLAM_MS;
    const total = COUNTS[last];
    const streamFrom = openAt + HOLD_MS;
    const passes: number[] = [];
    const slams: number[] = [];
    const lands: number[] = [];
    const spots: Point[] = [];
    const runners: Runner[] = [];
    for (let i = 0; i < total; i++) {
      let first = 0;
      while (COUNTS[first] <= i) first++;
      const legs: WarpLeg[] = [];
      if (first === 0)
        legs.push({
          from: drop,
          to: ringA,
          startMs: IN_MS,
          endMs: dives[0][i],
          fall: true,
        });
      else {
        // knocked loose by an earlier wisp's slam, forking off the other way
        const parent = i - COUNTS[first - 1];
        legs.push({
          from: LOCK,
          to: ringA,
          startMs: dives[first - 1][parent] + SLAM_MS,
          endMs: dives[first][i],
          arc: (parent % 2 ? -1 : 1) * BOW,
        });
      }
      for (let k = first; k <= last; k++) {
        const dive = dives[k][i];
        legs.push({
          from: ringB,
          to: LOCK,
          startMs: dive,
          endMs: dive + SLAM_MS,
        });
        passes.push(dive);
        if (k === last) break;
        slams.push(dive + SLAM_MS);
        legs.push({
          from: LOCK,
          to: ringA,
          startMs: dive + SLAM_MS,
          endMs: dives[k + 1][i],
          arc: ((i + k) % 2 ? 1 : -1) * BOW,
        });
      }
      const start = streamFrom + i * STREAM_STEP_MS;
      const spot = {
        x: barX + box.width * lerp(-SPREAD, SPREAD, i / (total - 1)),
        y: barY,
      };
      legs.push({ from: LOCK, to: LOCK, startMs: openAt, endMs: start });
      legs.push({
        from: LOCK,
        to: spot,
        startMs: start,
        endMs: start + STREAM_MS,
      });
      spots.push(spot);
      lands.push(start + STREAM_MS);
      const warp = planWarp(legs);
      const at: Point = { x: 0, y: 0 };
      runners.push({
        at: (ms) => warp.at(ms, at),
        startMs: warp.startMs,
        endMs: warp.endMs,
      });
    }
    for (const slam of slams) hit(0, slam, 0);
    hit(0, openAt, 1);
    const firstLand = streamFrom + STREAM_MS;
    hit(0, firstLand, 2);
    states.set(r, {
      ringA,
      ringB,
      drop,
      runners,
      passes,
      slams,
      waves,
      firstDive: waves[0],
      lastDive,
      openAt,
      lands,
      spots,
      barMid: { x: barX, y: barY },
      firstLand,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { ringA, ringB, drop, passes, slams, lastDive, openAt } = state;
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (lock.x + drop.x) * p,
        (lock.y + drop.y) * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    // a whoosh as each wave dives
    while (r.kicked < state.waves.length && ms >= state.waves[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    let flare = 0;
    for (let k = 0; k < passes.length; k++) {
      const since = ms - passes[k];
      if (since >= 0 && since < FLARE_MS)
        flare = Math.max(flare, 1 - since / FLARE_MS);
    }
    const grow = clamp01((ms - state.firstDive) / (lastDive - state.firstDive));
    const swell = 1 + FLARE * flare;
    const sizeA = lerp(RING_A[0], RING_A[1], grow) * swell;
    const sizeB = lerp(RING_B[0], RING_B[1], grow) * swell;
    const opening = clamp01((ms - IN_MS + OPEN_MS) / OPEN_MS);
    const openA = Math.min(
      opening,
      1 - clamp01((ms - lastDive - FLARE_MS) / CLOSE_MS),
    );
    const openB = Math.min(
      opening,
      1 - clamp01((ms - openAt - FLARE_MS) / CLOSE_MS),
    );
    drawPortal(ctx, ringA, sizeA, openA, now, 1, portalLook(3));
    drawPortal(ctx, ringB, sizeB, openB, now, 1, portalLook(5));
    for (let k = 0; k < passes.length; k++) {
      drawPortalPass(ctx, ringA, ms - passes[k], sizeA);
      drawPortalPass(ctx, ringB, ms - passes[k], sizeB);
    }
    drawDetonation(ctx, drop, ms - IN_MS, BURST_BLAST, now);
    for (let k = 0; k < slams.length; k++)
      drawDetonation(ctx, LOCK, ms - slams[k], SLAM_BLAST, now);
    drawDetonation(ctx, LOCK, ms - openAt, OPEN_BLAST, now);
    for (let i = 0; i < state.runners.length; i++) {
      const w = state.runners[i];
      drawWispBetween(ctx, w.at, ms, now, WISP, grow, w.startMs, w.endMs);
    }
    for (let i = 0; i < state.lands.length; i++)
      drawDetonation(ctx, state.spots[i], ms - state.lands[i], LAND_BLAST, now);
    drawDetonation(ctx, state.barMid, ms - state.firstLand, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS + (COUNTS[COUNTS.length - 1] - 1) * STREAM_STEP_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
