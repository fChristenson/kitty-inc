// the "Laser Gauntlet" event (flight; perma tier), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, through a
// run of laser grids rushing at it, beams scissoring back and forth between
// emitter wisps at their corners. As each grid comes up the guns blow its
// emitters one after another and its beams die; the last grid is
// eight-sided. The view crash-lands and the floor goes up a perma tier
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { canPromote, promotedTier } from "../../eventRewards";
import {
  canStartFlightStage,
  flightGuns,
  isFlightStageRunning,
  project,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "laserGauntlet";

// the grids: when the guns open up on each (ms into the flight), how long
// before that each rushes in from FAR to HOLD; their emitters (the last
// grid's more) round an ellipse (screen widths at depth 1), riding low
const GRIDS = 4;
const FIRST_SHOT = 300;
const GRID_EVERY = 480;
const RUSH_MS = 750;
const FAR = 12;
const HOLD = 2.4;
const RUSH = 0.0128;
const EMITTERS = 4;
const BIG_EMITTERS = 8;
const RX = 0.8;
const RY = 0.64;
const RIDE = -0.08;
const EMITTER = 3.5;
// the laser beams: their width (of the screen's width at depth 1), alpha,
// how fast they scissor
const LASER_W = 0.04;
const LASER_ALPHA = 0.7;
const SCISSOR = 0.006;
// the guns: one emitter every POP_EVERY ms
const POP_EVERY = 45;
const SHOT_MS = 70;
const SHOT_W = 0.018;
// blasts (of the screen's width) and shakes
const BLAST = 0.16;
const BIG_BLAST = 0.19;
const SHAKE = 0.6;
const BIG_SHAKE = 1.2;
const AFTER = 500;

interface Grid {
  shoot: number;
  emitters: number;
  big: boolean;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.laserGauntletEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.promoteFloorTier !== undefined &&
      canPromote(floor),
    arm: startLaserGauntlet,
  },
  { label: "Laser Gauntlet", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Laser Gauntlet
export function forceLaserGauntletEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

const depthOf = (grid: Grid, ms: number) =>
  Math.max(HOLD, FAR - (ms - grid.shoot + RUSH_MS) * RUSH);
const popAt = (grid: Grid, j: number) => grid.shoot + j * POP_EVERY;

function emitterAt(view: FlightView, grid: Grid, j: number, ms: number): Point {
  const a = (j / grid.emitters) * Math.PI * 2 + Math.PI / 4;
  return project(
    view,
    Math.cos(a) * RX,
    Math.sin(a) * RY + RIDE,
    depthOf(grid, ms),
  );
}

function startLaserGauntlet(floor: Floor, context: EventProcContext): void {
  const tier = context.critTier ?? pickCritTierByOdds();
  const grids: Grid[] = Array.from({ length: GRIDS }, (_, k) => {
    const big = k === GRIDS - 1;
    return {
      shoot: FIRST_SHOT + k * GRID_EVERY,
      emitters: big ? BIG_EMITTERS : EMITTERS,
      big,
    };
  });
  const pops = grids.flatMap((grid) =>
    Array.from({ length: grid.emitters }, (_, j) => ({ grid, j })),
  );
  const lastPop = Math.max(...pops.map((p) => popAt(p.grid, p.j)));
  const flyMs = lastPop + AFTER;
  const bigGrid = grids[GRIDS - 1];
  let bigged = false;
  const blasts = createBeats(
    pops,
    (p) => popAt(p.grid, p.j),
    (p) => {
      if (!p.grid.big) playExplosion();
      else if (!bigged) {
        bigged = true;
        playCritExplosion();
      }
      shakeScreen(p.grid.big ? BIG_SHAKE : SHAKE);
    },
  );
  startFlightStage(KEY, floor, context, {
    flyMs,
    draw: (ctx, view, ms, now) => {
      if (ms < 0) return;
      blasts.tick(ms, now);
      const guns = flightGuns(view);
      for (const grid of grids) {
        const n = grid.emitters;
        if (ms < grid.shoot - RUSH_MS || ms >= popAt(grid, n - 1)) continue;
        const z = depthOf(grid, ms);
        const alive = (j: number) => ms < popAt(grid, j);
        // each emitter's laser to one across from it, swinging between
        // its neighbours
        for (let j = 0; j < n; j++) {
          const across =
            (j +
              Math.floor(n / 2) +
              Math.round(Math.sin(ms * SCISSOR + j)) +
              n) %
            n;
          if (!alive(j) || !alive(across)) continue;
          drawBeam(
            ctx,
            emitterAt(view, grid, j, ms),
            emitterAt(view, grid, across, ms),
            (view.w * LASER_W) / z,
            LASER_ALPHA,
          );
        }
        for (let j = 0; j < n; j++) {
          if (!alive(j)) continue;
          const at = emitterAt(view, grid, j, ms);
          drawWisp(ctx, () => at, ms, now, (WISP_SIZE * EMITTER) / z, 0.5);
          const since = ms - (popAt(grid, j) - SHOT_MS);
          if (since >= 0)
            for (const gun of guns)
              drawBeam(ctx, gun, at, view.w * SHOT_W, 1 - since / SHOT_MS);
        }
      }
      for (const p of pops) {
        const pop = popAt(p.grid, p.j);
        drawDetonation(
          ctx,
          emitterAt(view, p.grid, p.j, pop),
          ms - pop,
          view.w * (p.grid === bigGrid ? BIG_BLAST : BLAST),
          now,
        );
      }
    },
    onEnd: () => {
      context.promoteFloorTier?.(floor, promotedTier(floor, tier));
      endEventProc(KEY);
    },
  });
}
