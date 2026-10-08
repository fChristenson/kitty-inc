// the "Ascend" event: it covers its crit, whose click freezes the screen while
// a wisp (shared/wisp) rises from below the lowest floor in view and zigzags up the
// building, touching each floor's income bar on its way: every bar it touches
// slams and climbs one perma crit tier. Then the orb floats off, the screen
// unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { startBoostEventStreamLoop } from "../../../../sound";
import { isFloorLocked } from "../../../../shared/detachedJob";
import {
  CRIT_TIER_ORDER,
  nextCritTier,
  pickCritTierByOdds,
} from "../../../critTypes";
import { triggerEventEndSlam } from "../../../../shared/eventEndSlam";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarCenter,
  setIncomePanelsHidden,
} from "../../../../floors/incomePanel";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import { smoothstep as easeInOut } from "../../../../shared/easing";

const KEY = "ascend";
// the orb starts this far below the lowest bar, and leaves this far above the top one
const START_DROP = 220;
const EXIT_RISE = 260;
// each hop swings this far (px) out to the side, alternating
const SWING = 140;
const FLASH_MS = 500;

interface Rung {
  floor: Floor;
  isGroundFloor: boolean;
  touchedAt: number | null;
}

interface RunningAscend {
  rungs: Rung[];
  startedAt: number;
}

let running: RunningAscend | null = null;

// every open floor in view whose bar shows and can still climb, lowest first
function findRungs(context: EventProcContext): Rung[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  return onScreen
    .filter((entry) => {
      const { floor } = entry;
      const isGroundFloor = context.floors.indexOf(floor) === 0;
      return (
        floor.unlocked &&
        !isFloorLocked(floor) &&
        floor.critMultiplierTier !== CRIT_TIER_ORDER[0] &&
        isVisibleOnFloor(entry, getIncomeBarCenter(isGroundFloor).y)
      );
    })
    .sort((a, b) => b.top - a.top)
    .slice(0, CONFIG.ascendEvent.maxFloors)
    .map((entry) => ({
      floor: entry.floor,
      isGroundFloor: context.floors.indexOf(entry.floor) === 0,
      touchedAt: null,
    }));
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.ascendEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true &&
      findRungs(context).length > 0,
    arm: startAscend,
  },
  { label: "Ascend", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Ascend
export function forceAscendEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a rung's bar center in the overlay's space; null when its floor is out of view
function barPoint(
  rung: Rung,
  getFloorRect: FloorRectResolver,
): { x: number; y: number } | null {
  const rect = getFloorRect(rung.floor);
  if (!rect) return null;
  const bar = getIncomeBarCenter(rung.isGroundFloor);
  return { x: rect.left + bar.x, y: rect.top + bar.y };
}

// where the orb is `elapsed` ms into the climb: hop k swings out to one side
// and lands on stop k + 1 (stop 0 below the first bar, the last above the top)
function orbAt(
  stops: { x: number; y: number }[],
  elapsed: number,
): { x: number; y: number } {
  const { hopMs } = CONFIG.ascendEvent;
  const hop = Math.max(0, elapsed) / hopMs;
  const k = Math.min(stops.length - 2, Math.floor(hop));
  const t = easeInOut(Math.min(1, hop - k));
  const from = stops[k];
  const to = stops[k + 1];
  const side = k % 2 === 0 ? 1 : -1;
  const cx = (from.x + to.x) / 2 + side * SWING;
  const cy = (from.y + to.y) / 2;
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
  };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const now = performance.now();
  for (const rung of event.rungs) {
    const rect = getFloorRect(rung.floor);
    if (!rect) continue;
    const flash =
      rung.touchedAt === null
        ? 0
        : Math.max(0, 1 - (now - rung.touchedAt) / FLASH_MS);
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawIncomePanel(ctx, rung.floor, rung.isGroundFloor, {
      whiteAlpha: flash * 0.8,
      rotation: 0,
    });
    ctx.restore();
  }
  const bars = event.rungs.map((rung) => barPoint(rung, getFloorRect));
  if (bars.some((bar) => bar === null)) return;
  const points = bars as { x: number; y: number }[];
  const first = points[0];
  const last = points[points.length - 1];
  const stops = [
    { x: first.x, y: first.y + START_DROP },
    ...points,
    { x: last.x, y: last.y - EXIT_RISE },
  ];
  const elapsed = now - event.startedAt;
  const totalMs = (stops.length - 1) * CONFIG.ascendEvent.hopMs;
  // grows in at the start and shrinks away on its way out
  const grow = Math.min(
    1,
    elapsed / 300,
    Math.max(0, (totalMs - elapsed) / 300),
  );
  drawWisp(
    ctx,
    (t) => (t < 0 || t > totalMs ? null : orbAt(stops, t)),
    elapsed,
    now,
    WISP_SIZE * grow,
  );
}

function startAscend(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const rungs = findRungs(context);
  if (rungs.length === 0) return;
  const { hopMs } = CONFIG.ascendEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningAscend = { rungs, startedAt: performance.now() };
  running = event;
  const isLive = () => running === event;
  setIncomePanelsHidden(rungs.map((rung) => rung.floor));
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  // the orb lands on bar k at the end of hop k
  rungs.forEach((rung, k) => {
    setTimeout(
      () => {
        if (!isLive()) return;
        rung.touchedAt = performance.now();
        rung.floor.critMultiplierTier = nextCritTier(
          rung.floor.critMultiplierTier,
        );
        triggerEventEndSlam(rung.floor, "bar");
      },
      (k + 1) * hopMs,
    );
  });

  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      stopSound();
      setIncomePanelsHidden([]);
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotions
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    (rungs.length + 1) * hopMs,
  );
}
