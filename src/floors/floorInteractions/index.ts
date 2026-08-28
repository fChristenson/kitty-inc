import { hitTestWorkers, clickWorker, getWorkerCenter } from "../worker";
import {
  hitTestUpgradeButton,
  getButtonCenter,
  triggerButtonPress,
  isCritUpgrade,
  consumeCritUpgrade,
  rollCritUpgrade,
  CRIT_UPGRADE_COUNT,
} from "../upgradeButton";
import { increaseIncomeRate, UPGRADE_MILESTONE_STEP } from "../incomePanel";
import { spendTotalIncome, getTotalIncome } from "../../totalIncome";
import { spawnCoinBurst } from "../coins";
import { spawnFloatingCoins } from "../coinFloat";
import { getUpgradeIndicatorCenter } from "../star";
import { playSold, playBloop, playCoinDrop, playExplosion } from "../../sound";
import { triggerScreenShake } from "../../screenShake";
import {
  hitTestFloorLock,
  unlockFloor,
  ensureLockedFloorAbove,
  getLockCenter,
} from "../floorLock";
import { activateBoosted, type Floor } from "../../gameState";

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
      (isCritUpgrade(floor) || getTotalIncome() >= floor.upgradeCost)) ||
    hitTestFloorLock(x, y, floor) ||
    hitTestWorkers(x, y, floor).length > 0
  );
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
    // the slot-machine jackpot moment: free, costs nothing, applies
    // CRIT_UPGRADE_COUNT upgrades at once, and shakes the whole screen for weight
    if (isCritUpgrade(floor)) {
      consumeCritUpgrade(floor);
      for (let i = 0; i < CRIT_UPGRADE_COUNT; i++) increaseIncomeRate(floor);
      rollCritUpgrade(floor);
      persist();
      triggerButtonPress(floor);
      triggerScreenShake();
      playCoinDrop();
      playExplosion();
      const buttonCenter = getButtonCenter(isGroundFloor);
      spawnCoinBurst(floor, buttonCenter.x, buttonCenter.y, () => {});
      // 3 more bursts on top of the one above, so the celebration keeps erupting
      // for as long as the crit text/shake animation is playing out. First one is
      // dead center (matching the "CRIT!" text) at 0s; the other two are offset
      // 40px left/right of it, staggered in after it (0.4s, 0.8s — spaced out
      // enough to read as separate pops, not one simultaneous burst) so all three
      // don't pop at once. Re-read fresh at each delayed spawn in case the user
      // scrolls in between
      const CENTER_BURST_OFFSET_PX = 200;
      const CENTER_BURST_OFFSET_PY = 100;
      const centerBursts: {
        offsetX: number;
        offsetY: number;
        delayMs: number;
      }[] = [
        { offsetX: 0, offsetY: 0, delayMs: 0 },
        {
          offsetX: -CENTER_BURST_OFFSET_PX,
          offsetY: -CENTER_BURST_OFFSET_PY,
          delayMs: 100,
        },
        {
          offsetX: CENTER_BURST_OFFSET_PX,
          offsetY: CENTER_BURST_OFFSET_PY,
          delayMs: 200,
        },
      ];
      for (const { offsetX, offsetY, delayMs } of centerBursts) {
        setTimeout(() => {
          const p = getScreenCenterLocal(floor);
          spawnCoinBurst(floor, p.x + offsetX, p.y + offsetY, () => {});
        }, delayMs);
      }
      if (floor.upgradeCount % UPGRADE_MILESTONE_STEP === 0) {
        const indicatorCenter = getUpgradeIndicatorCenter(floor);
        spawnCoinBurst(floor, indicatorCenter.x, indicatorCenter.y, () => {});
        playBloop();
      }
      return;
    }
    if (spendTotalIncome(floor.upgradeCost)) {
      increaseIncomeRate(floor);
      rollCritUpgrade(floor);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      const center = getButtonCenter(isGroundFloor);
      spawnCoinBurst(floor, center.x, center.y, () => {});
      // extra celebration burst right on the upgrade indicator every 10th upgrade,
      // same milestone that halves this floor's income interval
      if (floor.upgradeCount % UPGRADE_MILESTONE_STEP === 0) {
        const indicatorCenter = getUpgradeIndicatorCenter(floor);
        spawnCoinBurst(floor, indicatorCenter.x, indicatorCenter.y, () => {});
        playBloop();
      }
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
