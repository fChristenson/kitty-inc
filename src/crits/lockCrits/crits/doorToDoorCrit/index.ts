// Door to Door, a lock crit: a ring opens just under the flash, its twin right
// over the dark locked floor's lock; the number hops over the near ring and
// drops in as a wisp that bursts out of the twin at once, keeping its speed,
// slamming into the lock (a flash and a jolt), loops back round into the near
// ring and dives again, every pass quicker, the twin splitting more wisps out
// each time and both rings flaring and growing; the last pass all of them
// dive at once and smash the lock open, then they swing back round through
// the rings and burst out of the twin into the new floor's button: each of
// its next taps also hires a worker on the crit's own floor
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { snapshotMap } from "../../../../shared/snapshotState";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
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
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number hopping over the near ring (A_DOWN px under the flash, in the
// button's column) in TEXT_MS, popping into a wisp DROP_UP px over it that
// falls in over DROP_MS
const TEXT_MS = 130;
const ARC_RISE = 110;
const A_DOWN = 170;
const DROP_UP = 200;
const DROP_MS = 100;
const POP_MS = 120;
const POP = 110;
// the twin B_UP px over the lock; RING_A/RING_B px round, growing as the
// passes go, flaring FLARE at each
const B_UP = 150;
const RING_A: [number, number] = [70, 130];
const RING_B: [number, number] = [70, 145];
const FLARE = 0.35;
const FLARE_MS = 150;
const OPEN_MS = 110;
const CLOSE_MS = 100;
// the waves: COUNTS wisps dive each, STAGGER_MS apart, CYCLE_MS from one
// wave's dive to the next (quickening); out of the twin into the lock in
// SLAM_MS (the ones it splits out fanned FAN px), looping back bowed BOW px;
// the last wave all at once
const COUNTS = [1, 2, 3, 5, 8];
const STAGGER_MS = [0, 40, 28, 16, 0];
const CYCLE_MS = [320, 265, 225, 230];
const SLAM_MS = 45;
const FAN = 90;
const BOW = 200;
const SLAM_FLASH_MS = 140;
const SLAM_GLOW = 150;
// the lock bursting, a HOLD_MS breath, then the wisps swinging back into the
// near ring BACK_STEP_MS apart over BACK_MS, out of the twin onto the button
// in OUT_MS, SPREAD px either side of it
const HOLD_MS = 70;
const BACK_MS = 150;
const BACK_STEP_MS = 16;
const OUT_MS = 90;
const SPREAD = 60;
const LAND_MS = 160;
const LAND_GLOW = 70;
const WISP = WISP_SIZE * 1.1;
const OPEN_BLAST = 420;
const BUTTON_BLAST = 200;
// shakes by step: a slam, the lock bursting, onto the new button
const SHAKES = [0.7, 3, 1.3];

const WHITE = fadeStops(COLOR.white, 0.2);
const GOLD = fadeStops(COLOR.heavenlyGold);

interface Runner {
  at: (ms: number) => Point | null;
  startMs: number;
  endMs: number;
}
interface State {
  // from the flash; the lock, the twin, the button and the landing spots
  // follow the lock as it scrolls
  ringA: Point;
  drop: Point;
  lock: Point;
  ringB: Point;
  button: Point;
  spots: Point[];
  runners: Runner[];
  // every dive (both rings flash), every slam, each wave's first dive
  passes: number[];
  slams: number[];
  waves: number[];
  firstDive: number;
  lastDive: number;
  openAt: number;
  lastBack: number;
  lands: number[];
  firstLand: number;
}
const states = new WeakMap<Running, State>();

// the floor (by its index) whose crit opened each floor
const doors = snapshotMap<Floor, number>();

// each tap also hiring a worker on the floor whose crit opened it
const doorTaps = defineTapPerk("Door", (t) => {
  const door = t.floors[doors.get(t.floor) ?? -1];
  if (door?.unlocked && !isFloorMaxed(door)) t.hire(door);
});

registerFloorCrit("doorToDoorCrit", {
  reward(t) {
    doors.set(t.floor, t.floors.indexOf(t.ownFloor));
    doorTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const lockAt = getLockCenter();
    const btn = getButtonCenter(false);
    const at = bars[0];
    // the flash sits at the screen's middle: the button's column from it
    const ringA = { x: btn.x - (lockAt.x - at.x), y: A_DOWN };
    const drop = { x: ringA.x, y: ringA.y - DROP_UP };
    const lock = { x: at.x, y: at.y };
    const ringB = { x: at.x, y: at.y - B_UP };
    const button = { x: at.x + btn.x - lockAt.x, y: at.y + btn.y - lockAt.y };
    const last = COUNTS.length - 1;
    const total = COUNTS[last];
    // each wave's dives, by wisp
    const dives: number[][] = [];
    const waves: number[] = [];
    let d = TEXT_MS + DROP_MS;
    for (let k = 0; k <= last; k++) {
      waves.push(d);
      const wave: number[] = [];
      for (let j = 0; j < COUNTS[k]; j++) wave.push(d + j * STAGGER_MS[k]);
      dives.push(wave);
      d += CYCLE_MS[k] ?? 0;
    }
    const lastDive = waves[last];
    const openAt = lastDive + SLAM_MS;
    const backFrom = openAt + HOLD_MS;
    const passes: number[] = [];
    const slams: number[] = [];
    const lands: number[] = [];
    const spots: Point[] = [];
    const runners: Runner[] = [];
    for (let k = 0; k < last; k++)
      for (let j = 0; j < COUNTS[k]; j++) slams.push(dives[k][j] + SLAM_MS);
    for (let i = 0; i < total; i++) {
      let first = 0;
      while (COUNTS[first] <= i) first++;
      const legs: WarpLeg[] = [];
      if (first === 0)
        legs.push({
          from: drop,
          to: ringA,
          startMs: TEXT_MS,
          endMs: dives[0][i],
          fall: true,
        });
      else {
        // split out of the twin beside an earlier wisp, fanned off to a side
        const parent = i - COUNTS[first - 1];
        const out = dives[first - 1][parent];
        legs.push({
          from: ringB,
          to: lock,
          startMs: out,
          endMs: out + SLAM_MS,
          arc: (i % 2 ? -1 : 1) * FAN,
        });
        legs.push({
          from: lock,
          to: ringA,
          startMs: out + SLAM_MS,
          endMs: dives[first][i],
          arc: (i % 2 ? 1 : -1) * BOW,
        });
      }
      for (let k = first; k <= last; k++) {
        const dive = dives[k][i];
        passes.push(dive);
        legs.push({
          from: ringB,
          to: lock,
          startMs: dive,
          endMs: dive + SLAM_MS,
        });
        if (k === last) break;
        legs.push({
          from: lock,
          to: ringA,
          startMs: dive + SLAM_MS,
          endMs: dives[k + 1][i],
          arc: ((i + k) % 2 ? 1 : -1) * BOW,
        });
      }
      const back = backFrom + i * BACK_STEP_MS;
      const into = back + BACK_MS;
      passes.push(into);
      const spot = {
        x: button.x + lerp(-SPREAD, SPREAD, i / (total - 1)),
        y: button.y,
      };
      legs.push({ from: lock, to: lock, startMs: openAt, endMs: back });
      legs.push({
        from: lock,
        to: ringA,
        startMs: back,
        endMs: into,
        arc: (i % 2 ? -1 : 1) * BOW,
      });
      legs.push({ from: ringB, to: spot, startMs: into, endMs: into + OUT_MS });
      spots.push(spot);
      lands.push(into + OUT_MS);
      const warp = planWarp(legs);
      const pos: Point = { x: 0, y: 0 };
      runners.push({
        at: (ms) => warp.at(ms, pos),
        startMs: warp.startMs,
        endMs: warp.endMs,
      });
    }
    for (let k = 0; k < slams.length; k++) hit(0, slams[k], 0);
    hit(0, openAt, 1);
    const firstLand = lands[0];
    hit(0, firstLand, 2);
    // a whoosh as each wave dives, and as they swing back
    waves.push(backFrom + BACK_MS);
    states.set(r, {
      ringA,
      drop,
      lock,
      ringB,
      button,
      spots,
      runners,
      passes,
      slams,
      waves,
      firstDive: waves[0],
      lastDive,
      openAt,
      lastBack: backFrom + (total - 1) * BACK_STEP_MS + BACK_MS,
      lands,
      firstLand,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { ringA, drop, lock, ringB, button, spots, passes, slams } = state;
    // the lock's end of it follows a scroll
    const dx = bars[0].x - lock.x;
    const dy = bars[0].y - lock.y;
    if (dx !== 0 || dy !== 0) {
      lock.x += dx;
      lock.y += dy;
      ringB.x += dx;
      ringB.y += dy;
      button.x += dx;
      button.y += dy;
      for (let i = 0; i < spots.length; i++) {
        spots[i].x += dx;
        spots[i].y += dy;
      }
    }
    if (ms < TEXT_MS) {
      const u = ms / TEXT_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        drop.x * p,
        drop.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    while (r.kicked < state.waves.length && ms >= state.waves[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    let flare = 0;
    for (let k = 0; k < passes.length; k++) {
      const since = ms - passes[k];
      if (since >= 0 && since < FLARE_MS)
        flare = Math.max(flare, 1 - since / FLARE_MS);
    }
    const grow = clamp01(
      (ms - state.firstDive) / (state.lastDive - state.firstDive),
    );
    const swell = 1 + FLARE * flare;
    const sizeA = lerp(RING_A[0], RING_A[1], grow) * swell;
    const sizeB = lerp(RING_B[0], RING_B[1], grow) * swell;
    const open = Math.min(
      clamp01((ms - TEXT_MS + OPEN_MS) / OPEN_MS),
      1 - clamp01((ms - state.lastBack - FLARE_MS) / CLOSE_MS),
    );
    drawPortal(ctx, ringA, sizeA, open, now, 1, portalLook(2));
    drawPortal(ctx, ringB, sizeB, open, now, 0.7, portalLook(4));
    for (let k = 0; k < passes.length; k++) {
      drawPortalPass(ctx, ringA, ms - passes[k], sizeA);
      drawPortalPass(ctx, ringB, ms - passes[k], sizeB);
    }
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    const pop = (ms - TEXT_MS) / POP_MS;
    if (pop >= 0 && pop < 1) {
      ctx.globalAlpha = alpha * (1 - pop);
      drawGlow(ctx, WHITE, drop.x, drop.y, POP * (0.6 + pop));
    }
    // each slam a white flash on the lock, bigger as they come
    for (let k = 0; k < slams.length; k++) {
      const u = (ms - slams[k]) / SLAM_FLASH_MS;
      if (u < 0 || u >= 1) continue;
      ctx.globalAlpha = alpha * (1 - u);
      drawGlow(
        ctx,
        WHITE,
        lock.x,
        lock.y,
        SLAM_GLOW * (0.7 + 0.6 * (k / slams.length)) * (0.8 + 0.5 * u),
      );
    }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, lock, ms - state.openAt, OPEN_BLAST, now);
    for (let i = 0; i < state.runners.length; i++) {
      const w = state.runners[i];
      drawWispBetween(ctx, w.at, ms, now, WISP, grow, w.startMs, w.endMs);
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < state.lands.length; i++) {
      const u = (ms - state.lands[i]) / LAND_MS;
      if (u < 0 || u >= 1) continue;
      ctx.globalAlpha = alpha * (1 - u);
      drawGlow(ctx, GOLD, spots[i].x, spots[i].y, LAND_GLOW * (1 + u));
    }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, button, ms - state.firstLand, BUTTON_BLAST, now);
  },
  tailMs: DETONATION_MS + (COUNTS[COUNTS.length - 1] - 1) * BACK_STEP_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
