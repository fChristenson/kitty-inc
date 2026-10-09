// the "Meteor Splitter" event (flight; cash), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, where a
// huge meteor wisp rushes at it out of the deep; the guns blast it and it
// splits in two, they split in four, then eight, every split a blast that
// pays into the live total, quicker and closer each time, the last eight
// blown in a rattling barrage right in the view's face; then the view
// crash-lands on the floors
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { multiply } from "../../../../shared/bigNumber";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { clamp01, lerp } from "../../../../shared/easing";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { addTotalIncome } from "../../../../totalIncome";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
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

const KEY = "meteorSplitter";

// each generation (1, 2, 4, 8 meteors): when the guns blow its first, and
// its meteors' size (of a wisp, at depth 1); each next one a beat later
const GENS = [
  { at: 350, size: 9 },
  { at: 680, size: 6.5 },
  { at: 960, size: 5 },
  { at: 1180, size: 4 },
];
const SPLIT_EVERY = 30;
const LAST_EVERY = 40;
// the halves fly apart TURN rad either side of their parent's heading at
// SPREAD screen widths (at depth 1) a ms, flattened by FLAT on the way up
// and down; the rocks rush in from FAR to NEAR over RUSH_MS
const TURN = 0.9;
const SPREAD = 0.0021;
const FLAT = 0.7;
const START_Y = -0.064;
const FAR = 14;
const NEAR = 1.7;
const RUSH_MS = 1500;
// the guns' beams show so long before each blast, so wide (of the screen)
const BEAM_MS = 70;
const BEAM_W = 0.024;
// blasts (of the screen's width per wisp size, at depth 1) and shakes
const BLAST = 0.088;
const SHAKE = 0.6;
const LAST_SHAKE = 1.1;
const FINAL_SHAKE = 2.2;
const AFTER = 450;

interface Rock {
  gen: number;
  born: number;
  dies: number;
  from: Point;
  dir: Point;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.meteorSplitterEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startMeteorSplitter,
  },
  { label: "Meteor Splitter", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Meteor Splitter
export function forceMeteorSplitterEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

const depthAt = (ms: number) => lerp([FAR, NEAR], clamp01(ms / RUSH_MS));

// where a rock has drifted to by ms, in screen widths at depth 1
function driftOf(rock: Rock, ms: number, into: Point): Point {
  const t = Math.max(0, ms - rock.born);
  into.x = rock.from.x + rock.dir.x * SPREAD * t;
  into.y = rock.from.y + rock.dir.y * SPREAD * FLAT * t;
  return into;
}

// the tree of rocks, each blown into two by the next generation
function planRocks(): Rock[] {
  const rocks: Rock[] = [];
  const count = GENS.map(() => 0);
  const grow = (gen: number, born: number, from: Point, angle: number) => {
    const last = gen === GENS.length - 1;
    const dies =
      GENS[gen].at + count[gen]++ * (last ? LAST_EVERY : SPLIT_EVERY);
    const dir =
      gen === 0 ? { x: 0, y: 0 } : { x: Math.cos(angle), y: Math.sin(angle) };
    const rock: Rock = { gen, born, dies, from, dir };
    rocks.push(rock);
    if (last) return;
    const at = driftOf(rock, dies, { x: 0, y: 0 });
    for (const turn of [-TURN, TURN]) grow(gen + 1, dies, at, angle + turn);
  };
  grow(0, 0, { x: 0, y: START_Y }, -Math.PI / 2);
  return rocks;
}

function startMeteorSplitter(floor: Floor, context: EventProcContext): void {
  const { payoutsPerSplit } = CONFIG.meteorSplitterEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const rocks = planRocks();
  const lastDies = Math.max(...rocks.map((r) => r.dies));
  const flyMs = lastDies + AFTER;
  const drift: Point = { x: 0, y: 0 };
  const rockAt = (view: FlightView, rock: Rock, ms: number): Point => {
    driftOf(rock, ms, drift);
    return project(view, drift.x, drift.y, depthAt(ms));
  };
  const splits = createBeats(
    rocks,
    (r) => r.dies,
    (r) => {
      const final = r.dies === lastDies;
      if (final) playCritExplosion();
      else playExplosion();
      shakeScreen(
        final ? FINAL_SHAKE : r.gen === GENS.length - 1 ? LAST_SHAKE : SHAKE,
      );
      addTotalIncome(
        multiply(rewardPayoutAmount(floor, Date.now()), payoutsPerSplit),
      );
      pulseHudTotalFlash();
    },
  );
  startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      draw: (ctx, view, ms, now) => {
        if (ms < 0) return;
        splits.tick(ms, now);
        const guns = flightGuns(view);
        for (const r of rocks) {
          const size = GENS[r.gen].size;
          drawWispBetween(
            ctx,
            (t) => rockAt(view, r, Math.max(r.born, t)),
            ms,
            now,
            (WISP_SIZE * size) / depthAt(ms),
            0.4,
            r.born,
            r.dies,
          );
          const since = ms - (r.dies - BEAM_MS);
          if (since >= 0 && since < BEAM_MS) {
            const to = rockAt(view, r, ms);
            for (const gun of guns)
              drawBeam(ctx, gun, to, view.w * BEAM_W, 1 - since / BEAM_MS);
          }
          drawDetonation(
            ctx,
            rockAt(view, r, r.dies),
            ms - r.dies,
            (view.w * BLAST * size) / depthAt(r.dies),
            now,
          );
        }
      },
      onEnd: () => {
        // any split a dropped frame skipped still pays
        splits.tick(Infinity, performance.now());
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
}
