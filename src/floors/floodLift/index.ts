// the floors a flood of water lifts (Rising Tide, Tidal Wave): every open floor
// in view whose income bar shows, each raised to the highest floor tier among
// them (one tier past it, if they all already share it) as the water reaches
// its bar, which flashes and slams
import type { Floor } from "../../gameState";
import { isFloorLocked } from "../../shared/detachedJob";
import {
  CRIT_TIER_ORDER,
  critTierRank,
  nextCritTier,
  type CritTier,
} from "../../shared/critTypes";
import { triggerEventEndSlam } from "../../shared/eventEndSlam";
import type { FloorRectResolver } from "../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarCenter,
  setIncomePanelsHidden,
} from "../incomePanel";
import { isVisibleOnFloor, type EventProcContext } from "../eventProcs";

const FLASH_MS = 500;

export interface LiftedFloor {
  floor: Floor;
  isGroundFloor: boolean;
  // its bar's center, local to the clicked floor
  bar: { x: number; y: number };
  raises: boolean;
  liftedAt: number | null;
}

export interface FloodLift {
  floors: LiftedFloor[];
  target: CritTier;
}

// null when none of the floors in view would climb
export function planFloodLift(
  floor: Floor,
  context: EventProcContext,
): FloodLift | null {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined) return null;
  const visible = onScreen.filter((entry) => {
    const isGroundFloor = context.floors.indexOf(entry.floor) === 0;
    return (
      entry.floor.unlocked &&
      !isFloorLocked(entry.floor) &&
      isVisibleOnFloor(entry, getIncomeBarCenter(isGroundFloor).y)
    );
  });
  if (visible.length === 0) return null;
  const highest = visible
    .map((entry) => entry.floor.critMultiplierTier)
    .reduce((best, tier) =>
      critTierRank(tier) > critTierRank(best) ? tier : best,
    );
  const target = visible.every(
    (entry) => entry.floor.critMultiplierTier === highest,
  )
    ? highest === CRIT_TIER_ORDER[0]
      ? null
      : nextCritTier(highest)
    : highest;
  if (!target) return null;
  return {
    target,
    floors: visible.map((entry) => {
      const isGroundFloor = context.floors.indexOf(entry.floor) === 0;
      const bar = getIncomeBarCenter(isGroundFloor);
      return {
        floor: entry.floor,
        isGroundFloor,
        bar: { x: bar.x, y: bar.y + entry.top - top },
        raises:
          critTierRank(entry.floor.critMultiplierTier) < critTierRank(target),
        liftedAt: null,
      };
    }),
  };
}

// the event's overlay draws these bars itself while the flood runs
export function hideFloodBars(lift: FloodLift | null): void {
  setIncomePanelsHidden(lift ? lift.floors.map((lifted) => lifted.floor) : []);
}

export function drawFloodBars(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  lift: FloodLift,
  now: number,
): void {
  for (const lifted of lift.floors) {
    const rect = getFloorRect(lifted.floor);
    if (!rect) continue;
    const flash =
      lifted.liftedAt === null
        ? 0
        : Math.max(0, 1 - (now - lifted.liftedAt) / FLASH_MS);
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawIncomePanel(ctx, lifted.floor, lifted.isGroundFloor, {
      whiteAlpha: flash * 0.8,
      rotation: 0,
    });
    ctx.restore();
  }
}

// the water reaching a floor's bar raises it to the target tier
export function liftFloor(lifted: LiftedFloor, target: CritTier): void {
  lifted.liftedAt = performance.now();
  lifted.floor.critMultiplierTier = target;
  triggerEventEndSlam(lifted.floor, "bar");
}
