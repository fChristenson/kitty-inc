// the "Convoy" event (flight; levels + crit tier), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, where a
// long snaking train of cargo wisps sweeps across it in depth. The guns
// strafe it from tail to head, every car bursting one after another in a
// chain, the big engine at the front going up last; the view crash-lands
// and the floor gets free levels for every car
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
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { levelsFor } from "../../eventRewards";
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

const KEY = "convoy";

// the train: its cars (car 0 the engine at the front), the nearest's depth
// and the gap to the next one back
const CARS = 14;
const NEAR = 2.6;
const CAR_GAP = 0.55;
// its snake across the view (screen widths from its middle at depth 1): the
// sweep's reach and drift across, how high it rides and rolls, its speed and
// each car's lag along it
const SWEEP = 1.04;
const DRIFT = 0.32;
const DRIFT_MS = 2000;
const RIDE = -0.12;
const ROLL = 0.2;
const SPEED = 0.0016;
const LAG = 0.35;
const CAR = 4;
const ENGINE = 7;
// the strafe: when it starts, each car a beat after the one behind it, the
// engine held back a little; the beams show so long before each burst
const STRAFE = 900;
const POP_EVERY = 45;
const ENGINE_DELAY = 140;
const BEAM_MS = 70;
const BEAM_W = 0.019;
const ENGINE_BEAM_W = 0.04;
// blasts (of the screen's width, the cars' at depth 1) and shakes
const BLAST = 0.8;
const ENGINE_BLAST = 0.34;
const SHAKE = 0.5;
const ENGINE_SHAKE = 2.2;
const AFTER = 450;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.convoyEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.upgradeFloorFree !== undefined,
    arm: startConvoy,
  },
  { label: "Convoy", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Convoy
export function forceConvoyEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

const depthOf = (car: number) => NEAR + (CARS - 1 - car) * CAR_GAP;
// the strafe runs from the last car up to the engine
const popAt = (car: number) =>
  STRAFE + (CARS - 1 - car) * POP_EVERY + (car === 0 ? ENGINE_DELAY : 0);

function carAt(view: FlightView, car: number, ms: number): Point {
  const s = ms * SPEED - car * LAG;
  return project(
    view,
    Math.sin(s) * SWEEP + (1 - ms / DRIFT_MS) * DRIFT,
    RIDE + Math.cos(s * 1.3) * ROLL,
    depthOf(car),
  );
}

function startConvoy(floor: Floor, context: EventProcContext): void {
  const { levelShare } = CONFIG.convoyEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const cars = Array.from({ length: CARS }, (_, car) => car);
  const flyMs = popAt(0) + AFTER;
  const pops = createBeats(cars, popAt, (car) => {
    if (car === 0) playCritExplosion();
    else playExplosion();
    shakeScreen(car === 0 ? ENGINE_SHAKE : SHAKE);
  });
  startFlightStage(KEY, floor, context, {
    flyMs,
    draw: (ctx, view, ms, now) => {
      if (ms < 0) return;
      pops.tick(ms, now);
      const guns = flightGuns(view);
      // far to near, so the nearer cars draw over the farther
      for (let car = CARS - 1; car >= 0; car--) {
        const engine = car === 0;
        const pop = popAt(car);
        drawWispBetween(
          ctx,
          (t) => carAt(view, car, t),
          ms,
          now,
          (WISP_SIZE * (engine ? ENGINE : CAR)) / depthOf(car),
          engine ? 0.8 : 0.3,
          0,
          pop,
        );
        const since = ms - (pop - BEAM_MS);
        if (since >= 0 && since < BEAM_MS) {
          const to = carAt(view, car, ms);
          for (const gun of guns)
            drawBeam(
              ctx,
              gun,
              to,
              view.w * (engine ? ENGINE_BEAM_W : BEAM_W),
              1 - since / BEAM_MS,
            );
        }
        drawDetonation(
          ctx,
          carAt(view, car, pop),
          ms - pop,
          view.w * (engine ? ENGINE_BLAST : BLAST / depthOf(car)),
          now,
        );
      }
    },
    onEnd: () => {
      context.upgradeFloorFree?.(floor, levelsFor(floor, levelShare * CARS));
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
}
