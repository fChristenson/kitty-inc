import { randomInt } from "../utils";
import type { Floor } from "../gameState";
import type { CritTier } from "./upgradeButton";
import {
  loadBackgrounds,
  loadGroundImage as loadAssetGroundImage,
} from "../loadAssets";
import { MAX_INCOME_INTERVAL_SECONDS } from "./incomePanel";
import {
  type BigNumber,
  fromNumber,
  pow,
  multiply,
  ZERO,
} from "../shared/bigNumber";
import { CONFIG } from "../config";
import {
  FLOOR_W,
  FLOOR_H,
  FLOOR_X_MIN,
  FLOOR_X_MAX,
  GROUND_H,
  GROUND_TILE_W,
  DIVIDER_H,
  ROOM_CONTENT_SCALE,
  ROOM_CONTENT_SCALE_X,
  ROOM_CONTENT_Y_OFFSET,
  ROOM_WALL_OVERLAP_PX,
  SIDE_WALL_WIDTH,
  TOP_WALL_WIDTH,
} from "./constants";

export {
  FLOOR_W,
  FLOOR_H,
  FLOOR_X_MIN,
  FLOOR_X_MAX,
  GROUND_H,
  DIVIDER_H,
  ROOM_CONTENT_SCALE,
  SIDE_WALL_WIDTH,
  TOP_WALL_WIDTH,
};

// every literal balance number below lives in src/config.ts (CONFIG.floors) —
// tune income/pricing there, not here
const BASE_INCOME_AMOUNT = CONFIG.floors.baseIncomeAmount; // ground floor's starting $/interval
// each floor above starts at incomeGrowthFactor times the previous floor's income
// amount, while the interval only doubles (see BASE_INCOME_INTERVAL_SECONDS) —
// incomeGrowthFactor is kept equal to that doubling (see config.ts's own comment
// on why), so a fresh, un-upgraded floor's $/s is flat across floor depth; only
// upgrades (and other buildings) grow it from there
const INCOME_GROWTH_FACTOR = CONFIG.floors.incomeGrowthFactor;
const BASE_INCOME_INTERVAL_SECONDS = CONFIG.floors.baseIncomeIntervalSeconds; // ground floor's payout interval; each floor above doubles it
const BASE_UPGRADE_COST = CONFIG.floors.baseUpgradeCost; // ground floor's starting upgrade price; each floor above doubles it
const BASE_UNLOCK_COST = CONFIG.floors.baseUnlockCost; // floor 2's unlock price; each floor above doubles it
// each upgrade click's payoff scales exactly like the base income (same
// INCOME_GROWTH_FACTOR), so a higher floor's own upgrades are still worth
// proportionately more per click than a lower floor's — a flat step here would
// let enough flat-rate floor-1 upgrades out-earn a higher, unupgraded floor
const BASE_RATE_STEP = CONFIG.floors.baseRateStep;

// every processed floor background (see scripts/process-background-floors.mjs,
// which writes into dist/backgrounds/ — see ../loadAssets)
// background/gameCanvas reads this fresh every redraw via getActiveBackgrounds
let activeBackgrounds: HTMLImageElement[] = [];

// loads (or reuses, once already loaded) the floor backgrounds and makes it the
// active set every other floors/ function (and gameCanvas, via getActiveBackgrounds)
// reads from
export async function loadFloorBackgrounds(): Promise<HTMLImageElement[]> {
  if (activeBackgrounds.length > 0) return activeBackgrounds;
  activeBackgrounds = await loadBackgrounds();
  return activeBackgrounds;
}

// the currently-active building's own loaded background set — never empty once
// loadFloorBackgrounds has resolved at least once
export function getActiveBackgrounds(): HTMLImageElement[] {
  return activeBackgrounds;
}

// picks a background index in [0, count) for a floor being added on top of usedHistory
// (this building's existing floors' bgIndex values, oldest to newest). Prefers a
// background that hasn't appeared anywhere in usedHistory yet, picked randomly among
// whichever qualify; once every background has been used at least once, falls back to
// randomly picking between the two that were used longest ago (least recently used),
// excluding the immediately-previous floor's background whenever a different option
// exists — so a building never repeats a background back-to-back, and only starts
// repeating anything at all once its whole background pool has been shown at least once
export function pickBackgroundIndex(
  count: number,
  usedHistory: number[],
): number {
  if (count <= 1) return 0;
  const previous = usedHistory[usedHistory.length - 1] ?? null;
  const used = new Set(usedHistory);

  const unused: number[] = [];
  for (let i = 0; i < count; i++) if (!used.has(i)) unused.push(i);
  if (unused.length > 0) return unused[randomInt(0, unused.length - 1)];

  const lastSeenAt = new Map<number, number>();
  usedHistory.forEach((bg, position) => lastSeenAt.set(bg, position));
  const byStaleness = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => (lastSeenAt.get(a) ?? -1) - (lastSeenAt.get(b) ?? -1),
  );
  const candidates = byStaleness.slice(0, 2);
  const withoutPrevious = candidates.filter((i) => i !== previous);
  const pool = withoutPrevious.length > 0 ? withoutPrevious : candidates;
  return pool[randomInt(0, pool.length - 1)];
}

// floorLevel is 1-indexed (1 = ground floor), matching the number shown by floorNumber.ts.
// backgroundCount/existingBgIndexes pick which of the loaded backgrounds this floor gets
// (see pickBackgroundIndex above); multiplier scales every $ base value
// (buildings/index.ts's 1000x-per-building economy); groundFloorLocked forces floor 1
// to start locked/priced instead of the usual free ground floor — used for every
// building after the first one (buildings/index.ts spawns those locked)
export interface BuildFloorOptions {
  backgroundCount: number;
  existingBgIndexes?: number[];
  multiplier?: number;
  groundFloorLocked?: boolean;
  // a building-wide crit (see cityMap/index.ts) sets every floor to the same
  // tier — a freshly created floor starts as this tier too instead of null
  // (see floorLock.ts's ensureLockedFloorAbove, the only real caller of this)
  defaultCritTier?: CritTier | null;
}

// the level-0 (freshly-built, un-upgraded) income/cost/interval stats for a given
// floorLevel/multiplier — the one shared formula buildFloor and resetFloorToBaseStats
// below both derive from, so they can never drift out of sync with each other
function computeBaseFloorStats(
  floorLevel: number,
  multiplier: number,
): {
  incomeAmount: BigNumber;
  incomeIntervalSeconds: number;
  upgradeCost: BigNumber;
  rateStep: BigNumber;
} {
  return {
    incomeAmount: multiply(
      pow(INCOME_GROWTH_FACTOR, floorLevel - 1),
      BASE_INCOME_AMOUNT * multiplier,
    ),
    incomeIntervalSeconds: Math.min(
      BASE_INCOME_INTERVAL_SECONDS * 2 ** (floorLevel - 1),
      MAX_INCOME_INTERVAL_SECONDS,
    ),
    upgradeCost: multiply(
      pow(2, floorLevel - 1),
      BASE_UPGRADE_COST * multiplier,
    ),
    rateStep: multiply(
      pow(INCOME_GROWTH_FACTOR, floorLevel - 1),
      BASE_RATE_STEP * multiplier,
    ),
  };
}

export function buildFloor(
  floorLevel: number,
  options: BuildFloorOptions,
): Floor {
  const {
    backgroundCount,
    existingBgIndexes = [],
    multiplier = 1,
    groundFloorLocked = false,
    defaultCritTier = null,
  } = options;
  const isGroundFloor = floorLevel === 1;
  // BigNumber pow/multiply never overflow to Infinity no matter how high
  // floorLevel climbs (unlike plain `2 ** n`) — see shared/bigNumber
  const unlockCost = isGroundFloor
    ? groundFloorLocked
      ? fromNumber(BASE_UNLOCK_COST * multiplier)
      : ZERO
    : multiply(pow(2, floorLevel - 2), BASE_UNLOCK_COST * multiplier);
  // true once this level's own natural (uncapped) interval already exceeds the
  // 1h cap below — set once, forever, regardless of how far upgrades later
  // shrink the floor's actual incomeIntervalSeconds (see incomePanel.ts's
  // increaseIncomeRate, which charges these floors a steeper per-upgrade cost)
  const aboveCapTier =
    BASE_INCOME_INTERVAL_SECONDS * 2 ** (floorLevel - 1) >
    MAX_INCOME_INTERVAL_SECONDS;

  return {
    bgIndex: pickBackgroundIndex(backgroundCount, existingBgIndexes),
    ...computeBaseFloorStats(floorLevel, multiplier),
    upgradeCount: 0,
    unlocked: isGroundFloor && !groundFloorLocked,
    unlockCost,
    workerCount: 1,
    lastCollectedAt: Date.now(),
    hasOfficeChairs: false,
    hasOfficeSupplies: false,
    hasManager: false,
    critMultiplierTier: defaultCritTier,
    aboveCapTier,
    overtimeTicks: 0,
    overtimeStartedAt: null,
    overtimeCost: ZERO,
  };
}

// resets a floor's own upgrade progression (income/interval/upgradeCost/rateStep/
// upgradeCount) back to its level-0 stats, recomputed via the exact same formula
// buildFloor uses for this floorLevel/multiplier — the "Work overtime" gauge's
// tier-up reward (see floorInteractions.ts) calls this right alongside promoting
// a floor's permanent critMultiplierTier, so the floor re-climbs from lvl 0 with
// the new tier's rate multiplier applied to every future upgrade from here on.
// Deliberately leaves unlock state/workers/office upgrades/the crit tier itself
// untouched — only the level-0-derived stats reset. lastCollectedAt is reset to
// now so the fill-cycle timer restarts cleanly against the new interval instead
// of computing stale cycles against the old one
export function resetFloorToBaseStats(
  floor: Floor,
  floorLevel: number,
  multiplier = 1,
): void {
  const base = computeBaseFloorStats(floorLevel, multiplier);
  floor.incomeAmount = base.incomeAmount;
  floor.incomeIntervalSeconds = base.incomeIntervalSeconds;
  floor.upgradeCost = base.upgradeCost;
  floor.rateStep = base.rateStep;
  floor.upgradeCount = 0;
  floor.lastCollectedAt = Date.now();
}

// draws one floor slab (just its background art now — furniture is baked into bg.png);
// ctx must already be translated so this floor's own top-left is at (0, 0). Crops
// ROOM_CONTENT_SHIFT_UP px off the image's own top edge and draws the rest 1:1 from
// (0,0) — i.e. the whole room shifted up by that amount, no scaling — so the room's
// own floor-line content isn't hidden behind the taller divider band drawn below it.
// Leaves the bottom ROOM_CONTENT_SHIFT_UP px of this floor undrawn (no clip needed:
// the divider band that's drawn right after this always covers exactly that gap).
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  bgImage: HTMLImageElement,
  floor: Floor,
): void {
  // draws the FULL image, vertically compressed to fit above the divider band, so
  // no part of the art (including ceiling detail) is ever cropped off. Horizontally
  // compressed too, so the art spans wall-to-wall with only ROOM_WALL_OVERLAP_PX
  // reaching behind each side wall/top wall/divider band (drawOuterWall draws on top
  // of this and hides that sliver) instead of the walls masking a big strip of
  // full-width/full-height art
  ctx.drawImage(
    bgImage,
    0,
    0,
    FLOOR_W,
    FLOOR_H,
    SIDE_WALL_WIDTH - ROOM_WALL_OVERLAP_PX,
    ROOM_CONTENT_Y_OFFSET,
    FLOOR_W * ROOM_CONTENT_SCALE_X,
    FLOOR_H * ROOM_CONTENT_SCALE,
  );
  void floor; // no per-floor furniture placement left to draw; kept for a stable draw signature
}

let groundImage: HTMLImageElement | null = null;

// loads (or reuses, once already loaded) the ground/street art and makes it the
// active one drawGround reads from
export async function loadGroundImage(): Promise<HTMLImageElement> {
  if (groundImage) return groundImage;
  groundImage = await loadAssetGroundImage();
  return groundImage!;
}

// decorative strip beneath the ground floor (road + sidewalks + streetlights); ctx
// must already be translated to this strip's own top-left. width spans the whole
// building slot (floor room art + both side gutters), not just the room's own
// FLOOR_W, so the ground reads as continuous street under the gutters' sky strips
// too — tiled at its own native size (GROUND_TILE_W x GROUND_H) since it isn't
// perfectly seamless edge-to-edge but reads fine repeating at this scale/distance.
// worldX0 is the world-x this call's local x=0 maps to, so the tile phase stays
// locked to world coordinates instead of resetting to a fresh tile boundary (and
// visibly "swimming") every time the visible/clipped region's own left edge shifts
// during scrolling
const GROUND_OVERLAP = 15; // world units drawn past both the top and bottom edge
export function drawGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  worldX0: number,
): void {
  if (!groundImage) return;
  const phase = ((worldX0 % GROUND_TILE_W) + GROUND_TILE_W) % GROUND_TILE_W;
  // drawn a touch taller than its own logical [0, GROUND_H] bounds — overlapping up
  // into the floor room's own bottom edge and down past the canvas's true bottom
  // edge — so a hairline gap from sub-pixel canvas scaling can never show the floor
  // background peeking through right at either seam
  for (let x = -phase; x < width; x += GROUND_TILE_W) {
    ctx.drawImage(
      groundImage,
      x,
      -GROUND_OVERLAP,
      GROUND_TILE_W,
      GROUND_H + GROUND_OVERLAP * 2,
    );
  }
}

// everything below is this module's own facade: floors/ has several nested sub-parts
// (worker, upgradeButton, floorLock, ...) that stay together for internal reuse, but
// anything outside src/floors must import them from here, never from a nested path
export {
  startIncomeTicker,
  collectDueIncome,
  peekDueIncome,
  currentIncomeRatePerSecond,
  drawIncomePanel,
  getIncomeBarCenter,
  increaseIncomeRate,
} from "./incomePanel";
export {
  ensureLockedFloorAbove,
  unlockFloor,
  drawFloorLock,
  MAX_FLOORS_PER_BUILDING,
  getBuildingUnlockAllCost,
  unlockAllFloors,
} from "./floorLock";
export {
  drawCoins,
  hasActiveCoins,
  spawnCoinBurst,
  loadCoinImage,
} from "./coins";
export {
  hitTestFloorHover,
  handleFloorClick,
  isUpgradeButtonEnabled,
} from "./floorInteractions";
export {
  drawWorker,
  getBoostedWorkerCenters,
  loadWorkerSprite,
  getWorkerIconUrl,
  getManagerIconUrl,
  triggerJumpAll,
  getRenderedWorkerCount,
  MAX_RENDERED_WORKERS,
  WALK_SPEED,
  WORKER_FEET_Y_NUDGE_PX,
} from "./worker";
export { drawUpgradeStar, getUpgradeIndicatorCenter } from "./star";
export {
  drawUpgradeArrow,
  hitTestUpgradeArrow,
  getUpgradeArrowCenter,
} from "./upgradeArrow";
export {
  drawUpgradeButton,
  hitTestUpgradeButton,
  triggerButtonPress,
  startButtonHoldAnim,
  stopButtonHoldAnim,
  rollCritUpgrade,
  isCritUpgrade,
  forceCritUpgrade,
  forceMegaCritUpgrade,
  forceUltraCritUpgrade,
  forceFloorBuyCrit,
  rollFloorBuyCrit,
  pickHigherCritTier,
  getUniformCritTier,
  triggerSaleBoost,
  isSaleActive,
  floorIncomePerSecond,
  SALE_ASSUMED_CLICKS,
  triggerOvertimeBoost,
  isOvertimeActive,
  CRIT_TIER_CONFIG,
} from "./upgradeButton";
export type { CritTier } from "./upgradeButton";
export {
  spawnFloatingCoins,
  drawFloatingCoins,
  loadFloatingCoinImage,
} from "./coinFloat";
export { spawnIncomeFloatText, drawIncomeFloatText } from "./incomeFloatText";
