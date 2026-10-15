// Bee Line, a lock crit: the number arcs onto the dark locked floor's lock and
// unspools into a long ribbon of a swarm, hundreds of glitter specks behind a
// lead wisp, racing figure eights round the floor through the lock, faster
// and faster, a jolt and a pop every pass through it; then the lead swings
// out to the far wall and makes a dead straight beeline for the lock, the
// whole ribbon pouring in behind it, and the floor bursts open in the
// biggest blast; a few wisps fly on into its new button: each of its next
// taps also hires on the floor below
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import {
  drawSwarm,
  planSwarm,
  type Swarm,
} from "../../../../shared/animationStyles/swarm";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { quicken, quickenAt } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 170;
const ARC_RISE = 120;
// the figure eights: TURNS half-turns of a lemniscate REACH of the way to the
// nearer wall wide and TALL of a floor high, over LOOP_MS, off at START of
// its average speed and quickening; then the beeline in over STRAIGHT_MS
const TURNS = 4.5;
const REACH = 0.85;
const TALL = 0.28;
const LOOP_MS = 1200;
const START = 0.4;
const STRAIGHT_MS = 110;
// the ribbon: COUNT specks trailing up to LAG_MS behind the lead, SPREAD px
// either side of its line, wheeling round it
const COUNT = 220;
const SPECK = 18;
const LAG_MS = 280;
const SPREAD: [number, number] = [22, 40];
const SPIN_HZ: [number, number] = [1, 4];
const LEAD = WISP_SIZE * 1.3;
const POP = 120;
const OPEN_BLAST = 440;
// the wisps flying on into the new button REWARD_GAP_MS after it opens, over
// FLY_MS, bowed BOW px up
const WISPS = 3;
const REWARD_GAP_MS = 200;
const FLY_MS = 160;
const BOW = 160;
const REWARD_BLAST = 160;
// shakes by step: a pass through the lock, it bursting open, the button
const SHAKES = [0.7, 3.2, 1.2];

interface State {
  swarm: Swarm;
  leadAt: (ms: number) => Point;
  passes: number[];
  openAt: number;
  rewardAt: number;
  button: Point;
  wisps: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const lead: Point = { x: 0, y: 0 };

// each tap also hiring a worker on the floor below
const beeTaps = defineTapPerk("Bees", (t) => {
  const below = t.floors[t.floors.indexOf(t.floor) - 1];
  if (below?.unlocked) t.hire(below);
});

registerFloorCrit("beeLineCrit", {
  reward(t) {
    beeTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const wide = Math.min(lock.x - FLOOR_X_MIN, FLOOR_X_MAX - lock.x) * REACH;
    const tall = FLOOR_H * TALL;
    const turns = TURNS * Math.PI;
    const loopEnd = ARC_MS + LOOP_MS;
    const lineEnd = loopEnd + STRAIGHT_MS;
    // the lead's path round the lock (the crit draws round it): figure
    // eights, then dead straight in from the far end; held on the lock after
    const center = (ms: number, into: Point): Point => {
      if (ms < loopEnd) {
        const u = clamp01((ms - ARC_MS) / LOOP_MS);
        const a = turns * quicken(u, START);
        into.x = wide * Math.sin(a);
        into.y = tall * Math.sin(a) * Math.cos(a);
        return into;
      }
      const u = clamp01((ms - loopEnd) / STRAIGHT_MS);
      into.x = wide * (1 - u);
      into.y = 0;
      return into;
    };
    const openAt = lineEnd + LAG_MS;
    const swarm = planSwarm(center, {
      count: COUNT,
      startMs: ARC_MS,
      endMs: openAt,
      spread: (ms) =>
        SPREAD[0] + (SPREAD[1] - SPREAD[0]) * clamp01((ms - ARC_MS) / LOOP_MS),
      spinHz: SPIN_HZ,
      lagMs: LAG_MS,
      squash: 1,
    });
    // every pass of the lead through the lock
    const passes: number[] = [];
    for (let k = 1; k < TURNS; k++)
      passes.push(ARC_MS + LOOP_MS * quickenAt(k / TURNS, START));
    for (const at of passes) hit(0, at, 0);
    const rewardAt = openAt + REWARD_GAP_MS + FLY_MS;
    hit(0, openAt, 1);
    hit(0, rewardAt, 2);
    const btn = getButtonCenter(false);
    const button = { x: btn.x - lock.x, y: btn.y - lock.y };
    const flyFrom = openAt + REWARD_GAP_MS;
    const wisps = Array.from({ length: WISPS }, (_, i) => {
      const into: Point = { x: 0, y: 0 };
      const late = i * 25;
      return (ms: number): Point | null => {
        const u = (ms - flyFrom + late) / FLY_MS;
        if (u < 0 || u > 1) return null;
        const e = u * u;
        const w = 1 - e;
        const cx = button.x / 2 + (i - 1) * 60;
        const cy = Math.min(0, button.y) - BOW;
        into.x = 2 * w * e * cx + e * e * button.x;
        into.y = 2 * w * e * cy + e * e * button.y;
        return into;
      };
    });
    states.set(r, {
      swarm,
      leadAt: (ms) => center(ms, lead),
      passes,
      openAt,
      rewardAt,
      button,
      wisps,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
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
    }
    const { swarm, openAt } = state;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms < openAt) {
      drawSwarm(ctx, swarm, ms, SPECK);
      drawWispBetween(
        ctx,
        state.leadAt,
        ms,
        now,
        LEAD,
        0.8,
        ARC_MS,
        openAt - LAG_MS,
      );
    }
    for (const at of state.passes)
      drawDetonation(ctx, ORIGIN, ms - at, POP, now);
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    for (const wisp of state.wisps)
      drawWispBetween(ctx, wisp, ms, now, LEAD, 0.6, openAt, state.rewardAt);
    drawDetonation(ctx, state.button, ms - state.rewardAt, REWARD_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
