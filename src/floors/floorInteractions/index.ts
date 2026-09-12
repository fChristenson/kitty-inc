import {
  hitTestWorkers,
  clickWorker,
  getWorkerCenter,
  applyBoostAll,
  triggerJumpAll,
} from "../worker";
import { formatPrice } from "../../utils";
import {
  hitTestUpgradeButton,
  getButtonCenter,
  triggerButtonPress,
  isCritUpgrade,
  getCritTier,
  isChainCrit,
  isBoostCrit,
  isElevatorCrit,
  isExplosionCrit,
  isBootyCrit,
  consumeCritUpgrade,
  rollCritUpgrade,
  rollFloorBuyCrit,
  pickHigherCritTier,
  nextCritTier,
  isSaleActive,
  isOvertimeActive,
  endOvertimeActiveWindow,
  isOvertimeDraining,
  getOvertimeCost,
  retriggerOvertimeBoost,
  addOvertimeTicks,
  getOvertimeTicks,
  getOvertimeTickGoal,
  resetOvertimeTicks,
  isUpgradeButtonEnabled,
  CRIT_TIER_CONFIG,
  CHAIN_CRIT_CONTINUE_CHANCE,
  ELEVATOR_CRIT_CONTINUE_CHANCE,
  EXPLOSION_CRIT_CONTINUE_CHANCE,
  floorIncomePerSecond,
  SALE_INCOME_MULTIPLIER,
  BTN_W,
  BTN_H,
} from "../upgradeButton";
import {
  increaseIncomeRate,
  UPGRADE_MILESTONE_STEP,
  hitTestIncomeBar,
  getIncomeBarCenter,
  triggerIncomeBarPress,
} from "../incomePanel";
import {
  spendTotalIncome,
  addTotalIncome,
  getTotalIncome,
} from "../../totalIncome";
import { spawnCoinBurst } from "../coins";
import { spawnFloatingCoins } from "../coinFloat";
import { spawnIncomeFloatText } from "../incomeFloatText";
import { getUpgradeIndicatorCenter } from "../star";
import { hitTestUpgradeArrow } from "../upgradeArrow";
import { playSold, playBloop, playCoinDrop } from "../../sound";
import {
  hitTestFloorLock,
  unlockFloor,
  ensureLockedFloorAbove,
  getLockCenter,
} from "../floorLock";
import { activateBoosted, type Floor } from "../../gameState";
import { multiply } from "../../shared/bigNumber";
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

// re-exported for floors/index.ts's facade — the canonical check now lives in
// upgradeButton.ts (needs it internally for its own hold-animation deflate),
// this file just reuses it for hitTestFloorHover below
export { isUpgradeButtonEnabled };

// whether the drain-tail bar (see hitTestIncomeBar) can be clicked to re-trigger
// another event on this floor right now — an already-ultra (125x) floor has no
// next crit tier left to promote it to, so the event can't spawn/re-spawn there
// at all once it's reached that cap (shared by hitTestFloorHover and the actual
// click handling below, so the cursor and the click agree)
function canRetriggerOvertime(floor: Floor, now: number): boolean {
  return (
    floor.unlocked &&
    floor.critMultiplierTier !== "ultra" &&
    isOvertimeDraining(floor, now)
  );
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
      isUpgradeButtonEnabled(floor)) ||
    (canRetriggerOvertime(floor, Date.now()) &&
      hitTestIncomeBar(x, y, isGroundFloor)) ||
    hitTestFloorLock(x, y, floor) ||
    hitTestUpgradeArrow(x, y, floor) ||
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

// "boost crit" reward (see upgradeButton.ts's isBoostCrit): the SAME building-
// wide free-boost-everyone reward + cat-jump celebration hud/boostMenu.ts's
// buyBoostAll and mouse/index.ts's free click trigger already use — never a
// separate single-floor copy of that loop
function applyFloorBoost(floors: Floor[]): void {
  applyBoostAll(floors);
  triggerJumpAll(floors, Date.now());
}

// minimal deps a chain crit needs to grow a building while walking upward —
// a subset of FloorActionsDeps so non-floors callers (cityMap.ts's own
// building-unlock crit, via main.ts) don't need that type's unrelated fields
export interface ChainCritDeps {
  floors: Floor[];
  backgroundCount: number;
  multiplier: number;
  onFloorAdded: (floor: Floor) => void;
}

// "chain crit" (see upgradeButton.ts's rollCritUpgrade/isChainCrit/
// rollFloorBuyCrit's own chain flag): extends whatever reward `applyToFloor`
// represents onto the floor directly above the one that crit, unconditionally,
// then keeps climbing one floor at a time as long as `continueChance` keeps
// rolling true (defaults to chain's own CHAIN_CRIT_CONTINUE_CHANCE; the
// elevator/explosion procs pass their own dedicated chance instead, see their
// own call sites below). A locked floor in its path is auto-unlocked for free
// (no cost charged, no separate floor-buy crit roll of its own) before getting
// the reward applied. Stops the instant it runs past the building's own floor
// cap (no next floor left to queue, see ensureLockedFloorAbove's own
// MAX_FLOORS_PER_BUILDING guard) — shared by all 3 crit-rolling events (a plain
// upgrade click, unlocking a floor, and cityMap.ts's own unlocking a building),
// each supplying its own `applyToFloor` reward (free upgrade ticks vs a
// permanent critMultiplierTier promotion)
export function applyChainCrit(
  deps: ChainCritDeps,
  startIndex: number,
  applyToFloor: (floor: Floor, isGroundFloor: boolean) => void,
  continueChance: number = CHAIN_CRIT_CONTINUE_CHANCE,
): void {
  const { floors, backgroundCount, multiplier, onFloorAdded } = deps;
  let index = startIndex + 1;
  for (;;) {
    if (index >= floors.length) return;
    const target = floors[index];
    if (!target.unlocked) {
      unlockFloor(target);
      ensureLockedFloorAbove({
        floors,
        backgroundCount,
        multiplier,
        onAdd: onFloorAdded,
      });
    }
    applyToFloor(target, index === 0);
    index += 1;
    if (Math.random() >= continueChance) return;
  }
}

// "explosion crit" (see shared/critTypes's isExplosionCrit): the SAME reward
// walk as applyChainCrit above, but spreads in BOTH directions from the floor
// that actually crit — reuses applyChainCrit unmodified for the upward half
// (auto-unlocking a locked floor in its path, same guaranteed-first-step-then-
// roll-to-continue shape), then walks downward too. No unlock handling is
// needed going down — a building's floors are always unlocked contiguously
// from the ground up, so anything below an unlocked floor is already unlocked
export function applyExplosionCrit(
  deps: ChainCritDeps,
  centerIndex: number,
  applyToFloor: (floor: Floor, isGroundFloor: boolean) => void,
  continueChance: number = EXPLOSION_CRIT_CONTINUE_CHANCE,
): void {
  applyChainCrit(deps, centerIndex, applyToFloor, continueChance);
  const { floors } = deps;
  let index = centerIndex - 1;
  for (;;) {
    if (index < 0) return;
    applyToFloor(floors[index], index === 0);
    index -= 1;
    if (Math.random() >= continueChance) return;
  }
}

// handles a click at floor-local (x, y): unlocking, upgrading, or clicking a worker.
// every hit test/mutation here is identical to the old per-canvas click listener,
// just no longer tied to any one floor owning its own DOM canvas + event listener.
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

  // "Work overtime" boost's drain tail (see floors/upgradeButton): while the
  // gauge is ticking back down, the bar itself wiggles and becomes clickable —
  // paying the SAME cost the original purchase did re-triggers another event on
  // this SAME floor, letting several chained events fill the gauge all the way
  // (blocked once this floor's already ultra — see canRetriggerOvertime above)
  if (
    canRetriggerOvertime(floor, Date.now()) &&
    hitTestIncomeBar(x, y, isGroundFloor)
  ) {
    const cost = getOvertimeCost(floor);
    if (spendTotalIncome(cost)) {
      retriggerOvertimeBoost(floor, Date.now());
      persist();
      playSold();
      triggerIncomeBarPress(floor);
      const center = getIncomeBarCenter(isGroundFloor);
      spawnCoinBurst(floor, center.x, center.y, () => {});
    }
    return;
  }

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
      // one-shot roll on the floor actually being bought (never re-rolled) — a hit
      // permanently multiplies every future upgrade's rate gain on THIS floor (see
      // incomePanel.ts's increaseIncomeRate) and recolors its bar/button to match.
      // Only ever upgrades the floor's tier, never downgrades it — a brand new
      // floor can already start pre-set to its building's own crit tier (see
      // ensureLockedFloorAbove), and this roll is its own separate chance to land
      // something rarer still. Rolled before persist() so a hit is captured in
      // the same save
      const buyTier = rollFloorBuyCrit();
      if (buyTier) {
        floor.critMultiplierTier = pickHigherCritTier(
          floor.critMultiplierTier,
          buyTier.tier,
        );
        // chain crit (see rollFloorBuyCrit): promotes the SAME tier onto the
        // floor(s) above too, instead of just the one just unlocked
        if (buyTier.chain) {
          applyChainCrit(deps, floors.indexOf(floor), (target) => {
            target.critMultiplierTier = pickHigherCritTier(
              target.critMultiplierTier,
              buyTier.tier,
            );
          });
        }
        // elevator crit: the same tier-promotion reward as chain above, just
        // climbing from the building's own ground floor (index -1) up, with
        // its own ELEVATOR_CRIT_CONTINUE_CHANCE odds
        if (buyTier.elevator) {
          applyChainCrit(
            deps,
            -1,
            (target) => {
              target.critMultiplierTier = pickHigherCritTier(
                target.critMultiplierTier,
                buyTier.tier,
              );
            },
            ELEVATOR_CRIT_CONTINUE_CHANCE,
          );
        }
        // explosion crit: same tier-promotion reward again, spreading both up
        // and down from the floor that actually bought/unlocked
        if (buyTier.explosion) {
          applyExplosionCrit(deps, floors.indexOf(floor), (target) => {
            target.critMultiplierTier = pickHigherCritTier(
              target.critMultiplierTier,
              buyTier.tier,
            );
          });
        }
        // boost crit (see rollFloorBuyCrit): same building-wide free-boost
        // reward a per-click boost crit grants (see applyFloorBoost above)
        if (buyTier.boost) applyFloorBoost(floors);
        // booty crit: same flat one-time double-income effect a per-click
        // booty crit grants
        if (buyTier.booty) addTotalIncome(getTotalIncome());
      }
      persist();
      const center = getLockCenter();
      spawnCoinBurst(floor, center.x, center.y, () => {});
      if (buyTier)
        triggerCritCelebration(
          floor,
          buyTier.tier,
          getScreenCenterLocal,
          buyTier.chain,
          buyTier.boost,
          buyTier.elevator,
          buyTier.explosion,
          buyTier.booty,
        );
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
      // 1 second of the floor's own current income rate (times SALE_INCOME_MULTIPLIER),
      // credited straight to the player's total — never added back into
      // floor.incomeAmount itself, or each click would permanently raise the rate
      // the next click reads from
      const gained = multiply(
        multiply(floorIncomePerSecond(floor), SALE_INCOME_MULTIPLIER),
        tier ? CRIT_TIER_CONFIG[tier].multiplier : 1,
      );
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
    // "Work overtime" boost (see hud/boostMenu.ts's buyOvertimeBoost): free clicks
    // that add ticks to this floor's own overtime gauge (drawn by incomePanel.ts
    // in place of its normal fill-cycle bar) instead of paying out anything. A
    // crit rolled during the event scales the ticks a click adds by that tier's
    // own multiplier (5/25/125), same tier-aware celebration treatment as Sale
    if (isOvertimeActive(floor, Date.now())) {
      const tier = getCritTier(floor);
      if (tier) consumeCritUpgrade(floor);
      const ticks = tier ? CRIT_TIER_CONFIG[tier].multiplier : 1;
      const ticksBefore = getOvertimeTicks(floor);
      addOvertimeTicks(floor, ticks);
      rollCritUpgrade(floor);
      // filling the gauge all the way promotes this floor's own PERMANENT crit
      // tier one step (null -> crit -> mega -> ultra, capped at ultra) and ends
      // the event early instead of waiting out the rest of its own 15s — only
      // fires the instant it crosses the goal, not on every click while already
      // maxed, so a long drain-tail re-trigger chain can't over-promote past ultra
      let goalReached = false;
      const goal = getOvertimeTickGoal(floor);
      if (ticksBefore < goal && getOvertimeTicks(floor) >= goal) {
        goalReached = true;
        floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
        endOvertimeActiveWindow(floor, Date.now());
        // bar starts at 0 again for the new (bigger) tier's own goal, instead of
        // draining down from the just-maxed value against it
        resetOvertimeTicks(floor);
      }
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      if (goalReached) {
        triggerCritCelebration(
          floor,
          floor.critMultiplierTier!,
          getScreenCenterLocal,
        );
      } else if (tier) {
        triggerCritCelebration(floor, tier, getScreenCenterLocal);
      }
      const center = getButtonCenter(isGroundFloor);
      const jitterX = (Math.random() - 0.5) * (BTN_W * 0.75);
      const jitterY = (Math.random() - 0.5) * (BTN_H / 2);
      spawnCoinBurst(floor, center.x + jitterX, center.y + jitterY, () => {});
      spawnIncomeFloatText(
        floor,
        center.x,
        center.y,
        `+${ticks}`,
        tier !== null,
      );
      return;
    }
    // the slot-machine jackpot moment: free, costs nothing, applies that tier's
    // upgrade count at once, and celebrates with the same shake/flash/sfx/bursts
    // treatment as any other crit (see triggerCritCelebration) — mega/ultra are
    // the rarer, bigger-payout tiers (see upgradeButton.ts's rollCritUpgrade).
    // A "chain crit" (see isChainCrit) additionally extends this same tier's
    // upgrade count up through the building, and a "boost crit" (see
    // isBoostCrit) additionally free-activates this floor's own workers —
    // neither ever changes the button's own pre-click appearance, both only
    // read the flag right here, at the moment the already-armed tier is spent
    if (isCritUpgrade(floor)) {
      const tier = getCritTier(floor)!;
      const chain = isChainCrit(floor);
      const boost = isBoostCrit(floor);
      const elevator = isElevatorCrit(floor);
      const explosion = isExplosionCrit(floor);
      const booty = isBootyCrit(floor);
      consumeCritUpgrade(floor);
      const count = CRIT_TIER_CONFIG[tier].multiplier;
      for (let i = 0; i < count; i++) {
        applyUpgradeTick(floor, isGroundFloor);
      }
      if (chain) {
        const target = floors.indexOf(floor);
        applyChainCrit(deps, target, (chainFloor, chainIsGroundFloor) => {
          for (let i = 0; i < count; i++) {
            applyUpgradeTick(chainFloor, chainIsGroundFloor);
          }
        });
      }
      // elevator crit: the exact same walk-and-reward logic as chain above,
      // just started at index -1 so the FIRST floor it reaches is the
      // building's own ground floor (index 0) instead of the clicked floor's
      // own neighbor — it then keeps climbing upward from there with its own
      // ELEVATOR_CRIT_CONTINUE_CHANCE odds
      if (elevator) {
        applyChainCrit(
          deps,
          -1,
          (elevatorFloor, elevatorIsGroundFloor) => {
            for (let i = 0; i < count; i++) {
              applyUpgradeTick(elevatorFloor, elevatorIsGroundFloor);
            }
          },
          ELEVATOR_CRIT_CONTINUE_CHANCE,
        );
      }
      // explosion crit: same reward walk again, spreading both up AND down
      // from the clicked floor itself
      if (explosion) {
        const target = floors.indexOf(floor);
        applyExplosionCrit(
          deps,
          target,
          (explosionFloor, explosionIsGroundFloor) => {
            for (let i = 0; i < count; i++) {
              applyUpgradeTick(explosionFloor, explosionIsGroundFloor);
            }
          },
        );
      }
      if (boost) applyFloorBoost(floors);
      // booty crit: doubles the currently active company's total income once —
      // a flat effect, not tied to the tier/count that landed
      if (booty) addTotalIncome(getTotalIncome());
      persist();
      triggerButtonPress(floor);
      triggerCritCelebration(
        floor,
        tier,
        getScreenCenterLocal,
        chain,
        boost,
        elevator,
        explosion,
        booty,
      );
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
