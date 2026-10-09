// the "Storm Flight" event (flight; perma tier), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, into a
// storm of floating wisps. Lightning cracks up from under the view onto the
// first and arcs on from each to the next in a crackling chain, every strike
// a flash and a blast that blows its wisp, quicker and quicker, the last the
// biggest; the view crash-lands and the floor goes up a perma tier
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01 } from "../../../../shared/twinkle";
import { lerp } from "../../../../shared/easing";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { canPromote, promotedTier } from "../../eventRewards";
import {
  canStartFlightStage,
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

const KEY = "stormFlight";

// the wisps: how many, where they float (screen widths from its middle at
// depth 1, and depth), their sway; the first strike (ms into the flight) and
// the gap to the next, shrinking by QUICKEN each time
const NODES = 10;
const SPREAD_X = 0.88;
const SPREAD_Y = 0.6;
const DEPTH: [number, number] = [2.6, 5.1];
const SWAY = 0.064;
const NODE = 4;
const BIG_NODE = 6;
const FIRST_STRIKE = 450;
const STRIKE_GAP = 210;
const QUICKEN = 12;
// each bolt: shows this long before its strike (faint, gathering) and after,
// its forks and thickness; the first comes up from below the screen (of its
// width)
const LEAD_MS = 40;
const BOLT_MS = 180;
const FORKS = 2;
const BOLT = 1.6;
const BIG_BOLT = 2.4;
const STRIKE = 1.4;
const BELOW = 0.08;
// blasts (of the screen's width at depth 1) and shakes
const BLAST = 0.72;
const BIG_BLAST = 1.1;
const SHAKE = 0.9;
const BIG_SHAKE = 2.4;
const AFTER = 500;

interface Node {
  x: number;
  y: number;
  z: number;
  strike: number;
  big: boolean;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.stormFlightEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.promoteFloorTier !== undefined &&
      canPromote(floor),
    arm: startStormFlight,
  },
  { label: "Storm Flight", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Storm Flight
export function forceStormFlightEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function planNodes(): Node[] {
  return Array.from({ length: NODES }, (_, k) => ({
    x: (hash01(k, 7601) - 0.5) * 2 * SPREAD_X,
    y: (hash01(k, 7602) - 0.5) * 2 * SPREAD_Y,
    z: lerp(DEPTH, hash01(k, 7603)),
    strike: FIRST_STRIKE + k * (STRIKE_GAP - k * QUICKEN),
    big: k === NODES - 1,
  }));
}

const nodeAt = (view: FlightView, node: Node, ms: number): Point =>
  project(view, node.x + Math.sin(ms * 0.003 + node.z) * SWAY, node.y, node.z);

function startStormFlight(floor: Floor, context: EventProcContext): void {
  const tier = context.critTier ?? pickCritTierByOdds();
  const nodes = planNodes();
  const flyMs = nodes[NODES - 1].strike + AFTER;
  // each bolt from the wisp struck before (the first from under the view),
  // made once the view's known
  let bolts: Bolt[] | null = null;
  const strikes = createBeats(
    nodes,
    (n) => n.strike,
    (n) => {
      if (n.big) playCritExplosion();
      else playExplosion();
      shakeScreen(n.big ? BIG_SHAKE : SHAKE);
    },
  );
  startFlightStage(KEY, floor, context, {
    flyMs,
    draw: (ctx, view, ms, now) => {
      if (ms < 0) return;
      bolts ??= nodes.map((n, k) =>
        createBolt(
          k === 0
            ? { x: view.cx, y: view.y + view.h + view.w * BELOW }
            : nodeAt(view, nodes[k - 1], n.strike),
          nodeAt(view, n, n.strike),
          FORKS,
        ),
      );
      strikes.tick(ms, now);
      nodes.forEach((n, k) => {
        drawWispBetween(
          ctx,
          (t) => nodeAt(view, n, t),
          ms,
          now,
          (WISP_SIZE * (n.big ? BIG_NODE : NODE)) / n.z,
          0.3,
          0,
          n.strike,
        );
        const dt = ms - n.strike;
        if (dt >= -LEAD_MS && dt < BOLT_MS) {
          const bolt = bolts![k];
          const alpha = dt < 0 ? 0.4 : 1 - dt / BOLT_MS;
          drawBolt(ctx, bolt, alpha, n.big ? BIG_BOLT : BOLT);
          if (dt >= 0) drawStrike(ctx, bolt.to, alpha, STRIKE, now);
        }
        drawDetonation(
          ctx,
          nodeAt(view, n, n.strike),
          dt,
          (view.w * (n.big ? BIG_BLAST : BLAST)) / n.z,
          now,
        );
      });
    },
    onEnd: () => {
      context.promoteFloorTier?.(floor, promotedTier(floor, tier));
      endEventProc(KEY);
    },
  });
}
