// the "Battlecruiser" event (flight; levels + crit tier), a flight-stage
// event (see ../../flightStage): its crit's click dives the view into space,
// where a huge battlecruiser built of wisps joined by beams looms in out of
// the distance. The guns strafe it and its nodes blow in a wave rolling from
// corner to corner, its beams snapping as they go, then its core goes up in
// a huge blast; the view crash-lands and the floor gets free levels
import { levelsFor, type Floor } from "../../../../gameState";
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

const KEY = "battlecruiser";

// the ship: a grid of nodes (screen widths apart at depth 1), riding high,
// rocking; it looms in from FAR to HOLD
const COLS = 6;
const ROWS = 3;
const GAP_X = 0.305;
const GAP_Y = 0.256;
const RIDE = -0.12;
const ROCK = 0.032;
const FAR = 12;
const HOLD = 4;
const LOOM = 0.009;
const NODE = 3.5;
const CORE = 7;
const BEAM_W = 0.032;
// the strafe: when it starts, a wave rolling corner to corner, each node a
// beat after the ones nearer the first corner; the core after the last
const STRAFE = 750;
const WAVE_STEP = 67;
const CORE_AFTER = 180;
const SHOT_MS = 70;
const SHOT_W = 0.018;
// blasts (of the screen's width) and shakes
const BLAST = 0.144;
const CORE_BLAST = 0.35;
const SHAKE = 0.7;
const CORE_SHAKE = 2.6;
const AFTER = 500;

interface Node {
  c: number;
  r: number;
  pop: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.battlecruiserEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.upgradeFloorFree !== undefined,
    arm: startBattlecruiser,
  },
  { label: "Battlecruiser", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Battlecruiser
export function forceBattlecruiserEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

const depthAt = (ms: number) => Math.max(HOLD, FAR - ms * LOOM);

const nodeAt = (view: FlightView, node: Node, ms: number): Point =>
  project(
    view,
    (node.c - (COLS - 1) / 2) * GAP_X,
    (node.r - (ROWS - 1) / 2) * GAP_Y + RIDE + Math.sin(ms * 0.002) * ROCK,
    depthAt(ms),
  );

const coreAt = (view: FlightView, ms: number): Point =>
  project(view, 0, RIDE + Math.sin(ms * 0.002) * ROCK, depthAt(ms));

function startBattlecruiser(floor: Floor, context: EventProcContext): void {
  const { levelShare } = CONFIG.battlecruiserEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const nodes: Node[] = Array.from({ length: COLS * ROWS }, (_, i) => {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    return { c, r, pop: STRAFE + (c + r) * WAVE_STEP };
  });
  // the beams between neighbours, across and down
  const edges: [Node, Node][] = [];
  nodes.forEach((n, i) => {
    if (n.c < COLS - 1) edges.push([n, nodes[i + 1]]);
    if (n.r < ROWS - 1) edges.push([n, nodes[i + COLS]]);
  });
  const boomAt = Math.max(...nodes.map((n) => n.pop)) + CORE_AFTER;
  const flyMs = boomAt + AFTER;
  const pops = createBeats(
    nodes,
    (n) => n.pop,
    () => {
      playExplosion();
      shakeScreen(SHAKE);
    },
  );
  let boomed = false;
  startFlightStage(KEY, floor, context, {
    flyMs,
    draw: (ctx, view, ms, now) => {
      if (ms < 0) return;
      pops.tick(ms, now);
      if (!boomed && ms >= boomAt) {
        boomed = true;
        playCritExplosion();
        shakeScreen(CORE_SHAKE);
      }
      const z = depthAt(ms);
      for (const [a, b] of edges)
        if (ms < a.pop && ms < b.pop)
          drawBeam(
            ctx,
            nodeAt(view, a, ms),
            nodeAt(view, b, ms),
            (view.w * BEAM_W) / z,
            0.8,
          );
      if (ms < boomAt) {
        const core = coreAt(view, ms);
        drawWisp(ctx, () => core, ms, now, (WISP_SIZE * CORE) / z, 0.8);
      }
      const guns = flightGuns(view);
      for (const n of nodes) {
        if (ms < n.pop) {
          const at = nodeAt(view, n, ms);
          drawWisp(ctx, () => at, ms, now, (WISP_SIZE * NODE) / z, 0.4);
          const since = ms - (n.pop - SHOT_MS);
          if (since >= 0)
            for (const gun of guns)
              drawBeam(ctx, gun, at, view.w * SHOT_W, 1 - since / SHOT_MS);
        }
        drawDetonation(
          ctx,
          nodeAt(view, n, n.pop),
          ms - n.pop,
          view.w * BLAST,
          now,
        );
      }
      drawDetonation(
        ctx,
        coreAt(view, boomAt),
        ms - boomAt,
        view.w * CORE_BLAST,
        now,
      );
    },
    onEnd: () => {
      context.upgradeFloorFree?.(
        floor,
        levelsFor(floor, levelShare * nodes.length),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
}
