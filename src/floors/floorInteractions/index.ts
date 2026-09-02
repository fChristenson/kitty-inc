import { hitTestWorkers, clickWorker, getWorkerCenter } from "../worker";
import { formatPrice } from "../../utils";
import {
  hitTestUpgradeButton,
  getButtonCenter,
  triggerButtonPress,
  isCritUpgrade,
  getCritTier,
  consumeCritUpgrade,
  rollCritUpgrade,
  isSaleActive,
  CRIT_TIER_CONFIG,
  floorIncomePerSecond,
  BTN_W,
  BTN_H,
} from "../upgradeButton";
import { increaseIncomeRate, UPGRADE_MILESTONE_STEP } from "../incomePanel";
import {
  spendTotalIncome,
  getTotalIncome,
  addTotalIncome,
} from "../../totalIncome";
import { spawnCoinBurst } from "../coins";
import { spawnFloatingCoins } from "../coinFloat";
import { spawnIncomeFloatText } from "../incomeFloatText";
import { getUpgradeIndicatorCenter } from "../star";
import { playSold, playBloop, playCoinDrop } from "../../sound";
import {
  hitTestFloorLock,
  unlockFloor,
  ensureLockedFloorAbove,
  getLockCenter,
} from "../floorLock";
import { activateBoosted, type Floor } from "../../gameState";
import { triggerCritCelebration } from "./critCelebration";

export interface FloorActionsDeps {
  floors: Floor[];
  backgroundCount: number;
  multiplier: number; // this building's economy scale (buildings/index.ts)
  persist: () => void;
  // gameCanvas.ts's own continuous per-frame redraw already picks up any state change
  // on the next tick, so these just need to register the new floor for hit-testing/
  // scroll bookkeeping — no manual "redraw this one floor now" plumbing needed anymore
  onFloorAdded: (floor: Floor) => void;
  // converts the current visual screen center (where screenShake's "CRIT!" flash is
  // drawn) into this floor's own local coordinate space, so a coin burst can be
  // anchored there instead of at a fixed floor-local point
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number };
}

// whether a floor-local point lands on anything hoverable (cursor should be "pointer")
export function hitTestFloorHover(
  x: number,
  y: number,
  floor: Floor,
  isGroundFloor: boolean,
): boolean {
  return (
    (hitTestUpgradeButton(x, y, isGroundFloor) &&
      floor.unlocked &&
      (isSaleActive(floor, Date.now()) ||
        isCritUpgrade(floor) ||
        getTotalIncome() >= floor.upgradeCost)) ||
    hitTestFloorLock(x, y, floor) ||
    hitTestWorkers(x, y, floor).length > 0
  );
}

// one upgrade tick's worth of logic — rate increase, next-crit reroll, the small
// jittered coin burst at the button, and the every-10th-upgrade milestone burst
// (same one that halves the floor's income interval, see incomePanel.ts). Shared
// by a normal paid click and the crit branch below, which runs this exactly
// CRIT_UPGRADE_COUNT times back to back (minus the cost) — calling this once per
// simulated click, not just once total, is what makes a crit landing on a
// multiple of 10 mid-run behave identically to 5 real clicks would
function applyUpgradeTick(floor: Floor, isGroundFloor: boolean): void {
  increaseIncomeRate(floor);
  rollCritUpgrade(floor);
  const center = getButtonCenter(isGroundFloor);
  // small random jitter so the burst doesn't spawn at the exact same pixel
  // every single click — a random point spanning the button's own inner width
  // on X (scaled back 25%) and half its height on Y
  const jitterX = (Math.random() - 0.5) * (BTN_W * 0.75);
  const jitterY = (Math.random() - 0.5) * (BTN_H / 2);
  spawnCoinBurst(floor, center.x + jitterX, center.y + jitterY, () => {});
  // extra celebration burst right on the upgrade indicator every 10th upgrade,
  // same milestone that halves this floor's income interval
  if (floor.upgradeCount % UPGRADE_MILESTONE_STEP === 0) {
    const indicatorCenter = getUpgradeIndicatorCenter(floor);
    spawnCoinBurst(floor, indicatorCenter.x, indicatorCenter.y, () => {});
    playBloop();
  }
}

// handles a click at floor-local (x, y): unlocking, upgrading, or clicking a worker.
// every hit test/mutation here is identical to the old per-canvas click listener,
// just no longer tied to any one floor owning its own DOM canvas + event listener
export function handleFloorClick(
  deps: FloorActionsDeps,
  floor: Floor,
  x: number,
  y: number,
  isGroundFloor: boolean,
): void {
  const {
    floors,
    backgroundCount,
    multiplier,
    persist,
    onFloorAdded,
    getScreenCenterLocal,
  } = deps;

  if (hitTestFloorLock(x, y, floor)) {
    if (spendTotalIncome(floor.unlockCost)) {
      unlockFloor(floor);
      playSold();
      ensureLockedFloorAbove({
        floors,
        backgroundCount,
        multiplier,
        onAdd: onFloorAdded,
      });
      persist();
      const center = getLockCenter();
      spawnCoinBurst(floor, center.x, center.y, () => {});
    }
    return;
  }

  if (hitTestUpgradeButton(x, y, isGroundFloor) && floor.unlocked) {
    // "Sale" boost: free clicks that add upgradeCount straight to incomeAmount,
    // instead of the normal cost/rateStep math — takes priority over the crit
    // branch below so a crit rolled during a sale just multiplies this payout
    // (see CRIT_TIER_CONFIG's saleMultiplier) rather than stacking free upgrades.
    // Tier-aware (mega/ultra get their own bigger multiplier + celebration, not
    // just a flat crit-sized bump) via the same triggerCritCelebration every
    // upgrade-click crit uses
    if (isSaleActive(floor, Date.now())) {
      const tier = getCritTier(floor);
      if (tier) consumeCritUpgrade(floor);
      // 1 second of the floor's own current income rate, credited straight to
      // the player's total — never added back into floor.incomeAmount itself, or
      // each click would permanently raise the rate the next click reads from
      const gained =
        floorIncomePerSecond(floor) *
        (tier ? CRIT_TIER_CONFIG[tier].saleMultiplier : 1);
      addTotalIncome(gained);
      rollCritUpgrade(floor);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      if (tier) triggerCritCelebration(floor, tier, getScreenCenterLocal);
      const center = getButtonCenter(isGroundFloor);
      const jitterX = (Math.random() - 0.5) * (BTN_W * 0.75);
      const jitterY = (Math.random() - 0.5) * (BTN_H / 2);
      spawnCoinBurst(floor, center.x + jitterX, center.y + jitterY, () => {});
      spawnIncomeFloatText(
        floor,
        center.x,
        center.y,
        `+${formatPrice(gained)}`,
        tier !== null,
      );
      return;
    }
    // the slot-machine jackpot moment: free, costs nothing, applies that tier's
    // upgrade count at once, and celebrates with the same shake/flash/sfx/bursts
    // treatment as any other crit (see triggerCritCelebration) — mega/ultra are
    // the rarer, bigger-payout tiers (see upgradeButton.ts's rollCritUpgrade)
    if (isCritUpgrade(floor)) {
      const tier = getCritTier(floor)!;
      consumeCritUpgrade(floor);
      const count = CRIT_TIER_CONFIG[tier].count;
      for (let i = 0; i < count; i++) {
        applyUpgradeTick(floor, isGroundFloor);
      }
      persist();
      triggerButtonPress(floor);
      triggerCritCelebration(floor, tier, getScreenCenterLocal);
      return;
    }
    if (spendTotalIncome(floor.upgradeCost)) {
      applyUpgradeTick(floor, isGroundFloor);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      return;
    }
  }

  // a click on overlapping cats hits every one of them, not just the frontmost
  for (const workerIndex of hitTestWorkers(x, y, floor)) {
    // Date.now()-based (not performance.now()) so it matches drawWorker's
    // Date.now()-based `now`, which is what clickedAt actually gets compared
    // against to time the click-bounce/jump-sprite reaction
    if (!clickWorker(floor, workerIndex, Date.now())) continue;
    playBloop();
    const center = getWorkerCenter(floor, workerIndex);
    if (center) {
      spawnCoinBurst(floor, center.x, center.y, () => {});
      // start the float right away at just this worker, so the boost visibly
      // kicks in immediately instead of waiting for the next periodic tick
      spawnFloatingCoins(floor, center.x, center.y, () => {});
    }
    // clicking a worker only (re)activates that specific worker's boost/15s timer.
    // Date.now()-based (not performance.now()) so it matches incomePanel.ts's
    // persisted, Date.now()-based cycle tracking that reads the same boost state
    activateBoosted(floor, workerIndex, Date.now());
    persist();
  }
}
