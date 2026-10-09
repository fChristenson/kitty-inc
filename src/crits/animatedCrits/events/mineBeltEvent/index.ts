// the "Mine Belt" event (flight; levels + crit tier), a flight-stage event
// (see ../../flightStage): its crit's click dives the view into space, where
// rows of blinking bomb wisps drift in out of the distance. Twin beams from
// the screen's bottom corners rake across each row, setting its mines off
// one after another in a chain, row after row, the last row all going up
// together in one cluster; the view crash-lands and the floor gets free
// levels for every mine
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01 } from "../../../../shared/twinkle";
import { clamp01 } from "../../../../shared/easing";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { levelsFor } from "../../eventRewards";
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

const KEY = "mineBelt";

// the rows: when the beams rake each (ms into the flight), how long before
// that each drifts in, its mines; the last row is the big one
const ROWS = 4;
const FIRST_RAKE = 850;
const RAKE_EVERY = 520;
const DRIFT_MS = 800;
const PER_ROW = 6;
const BIG_ROW = 8;
// where they sit (screen widths from its middle at depth 1): the gap
// between mines, each row's height, the big row's wave
const MINE_GAP = 0.51;
const BIG_GAP = 0.42;
const ROW_Y = 0.21;
const BIG_WAVE = 0.24;
const BOB = 0.03;
// their drift in from FAR, slowing to HOLD, and their size
const FAR = 12;
const HOLD = 3;
const DRIFT = 0.012;
const MINE = 4;
const FUSE = 0.24;
// the beams: from the screen's bottom corners, firing this long before each
// mine goes, showing so long, and their widths (of the screen's width)
const GUN_X = 0.1;
const GUN_Y = 0.93;
const BEAM_LEAD = 60;
const BEAM_MS = 120;
const BEAM_W = 0.02;
const BIG_BEAM_MS = 200;
const BIG_BEAM_W = 0.05;
// the big row goes up together, scattered over this long after its rake
const BIG_AFTER = 150;
const BIG_SPREAD = 120;
// blasts (of the screen's width) and shakes
const BLAST = 0.17;
const BIG_BLAST = 0.24;
const SHAKE = 0.6;
const BIG_SHAKE = 1.4;
const AFTER = 450;

interface Mine {
  row: number;
  x: number;
  y: number;
  start: number;
  blast: number;
  big: boolean;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.mineBeltEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.upgradeFloorFree !== undefined,
    arm: startMineBelt,
  },
  { label: "Mine Belt", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Mine Belt
export function forceMineBeltEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

const rakeAt = (row: number) => FIRST_RAKE + row * RAKE_EVERY;

function planMines(): Mine[] {
  return Array.from({ length: ROWS }, (_, row) => {
    const big = row === ROWS - 1;
    const n = big ? BIG_ROW : PER_ROW;
    const rake = rakeAt(row);
    return Array.from({ length: n }, (_, k) => ({
      row,
      x: (k - (n - 1) / 2) * (big ? BIG_GAP : MINE_GAP),
      y: big ? Math.sin(k) * BIG_WAVE : (row % 2 ? -1 : 1) * ROW_Y,
      start: rake - DRIFT_MS,
      blast: big
        ? rake + BIG_AFTER + hash01(k, 7301) * BIG_SPREAD
        : rake + k * 45,
      big,
    }));
  }).flat();
}

const depthOf = (mine: Mine, ms: number) =>
  Math.max(HOLD, FAR - (ms - mine.start) * DRIFT);

const mineAt = (view: FlightView, mine: Mine, ms: number): Point =>
  project(
    view,
    mine.x,
    mine.y + Math.sin(ms * 0.006 + mine.x * 7) * BOB,
    depthOf(mine, ms),
  );

function startMineBelt(floor: Floor, context: EventProcContext): void {
  const { levelShare } = CONFIG.mineBeltEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const mines = planMines();
  const flyMs = Math.max(...mines.map((m) => m.blast)) + AFTER;
  const bigRake = rakeAt(ROWS - 1);
  let bigged = false;
  const blasts = createBeats(
    mines,
    (m) => m.blast,
    (m) => {
      if (!m.big) playExplosion();
      shakeScreen(m.big ? BIG_SHAKE : SHAKE);
    },
  );
  startFlightStage(KEY, floor, context, {
    flyMs,
    draw: (ctx, view, ms, now) => {
      if (ms < 0) return;
      blasts.tick(ms, now);
      if (!bigged && ms >= bigRake + BIG_AFTER) {
        bigged = true;
        playCritExplosion();
      }
      const guns = [
        { x: view.x + view.w * GUN_X, y: view.y + view.h * GUN_Y },
        { x: view.x + view.w * (1 - GUN_X), y: view.y + view.h * GUN_Y },
      ];
      for (const m of mines) {
        if (ms < m.start || ms >= m.blast) continue;
        const z = depthOf(m, ms);
        const at = mineAt(view, m, ms);
        drawLitFuse(
          ctx,
          at,
          clamp01((ms - m.start) / (m.blast - m.start)),
          (view.w * FUSE) / z,
          now,
        );
        drawWisp(ctx, () => at, ms, now, (WISP_SIZE * MINE) / z, 0.4);
      }
      // the beams raking each row onto each mine as it goes, then one big
      // pair into the middle of the last row
      for (const m of mines) {
        if (m.big) continue;
        const since = ms - (m.blast - BEAM_LEAD);
        if (since < 0 || since > BEAM_MS) continue;
        const to = mineAt(view, m, m.blast);
        for (const gun of guns)
          drawBeam(ctx, gun, to, view.w * BEAM_W, 1 - since / BEAM_MS);
      }
      const since = ms - bigRake;
      if (since >= 0 && since < BIG_BEAM_MS) {
        const to = project(view, 0, 0, HOLD);
        for (const gun of guns)
          drawBeam(ctx, gun, to, view.w * BIG_BEAM_W, 1 - since / BIG_BEAM_MS);
      }
      for (const m of mines)
        drawDetonation(
          ctx,
          mineAt(view, m, m.blast),
          ms - m.blast,
          view.w * (m.big ? BIG_BLAST : BLAST),
          now,
        );
    },
    onEnd: () => {
      context.upgradeFloorFree?.(
        floor,
        levelsFor(floor, levelShare * mines.length),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
}
