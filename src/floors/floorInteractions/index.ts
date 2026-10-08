import {
  applyFloorCrit,
  critNow,
  eventProcContext,
  promoteTierKeepingLevel,
  isCritUpgrade,
  isCritUp,
  isCritDown,
  getMergeCrit,
  getFloorCrit,
  getCritTier,
  getBonusTierCrit,
  consumeBonusTierCrit,
  consumeCritUpgrade,
  rollCritUpgrade,
  rollFloorBuyCrit,
  nextCritTier,
  CRIT_TIER_CONFIG,
  isBoostEventArmed,
  disarmBoostEvent,
  isUnionEventArmed,
  disarmUnionEvent,
  isHuntEventArmed,
  disarmHuntEvent,
  isSwarmEventArmed,
  disarmSwarmEvent,
  isSwarmSaleActive,
  triggerSwarmSale,
  startBoostEvent,
  type OnScreenFloors,
  startUnionEvent,
  startHuntEvent,
  armTakenEventProc,
  getClaimedEventCover,
  takeClaimedEventProc,
  type ScreenAreaLocal,
  readCritProcs,
  tierOnlyCrit,
  pickHigherCritTier,
  triggerCritCelebration,
} from "../../crits";

import {
  isDetachedJobRunning,
  isDetachedJobPending,
  isFloorLocked,
  liveEffect,
} from "../../shared/detachedJob";
import { hitTestWorkers, clickWorker } from "../worker";
import {
  hitTestUpgradeButton,
  getButtonCenter,
  triggerButtonPress as animateButtonPress,
  isSaleActive,
  isOvertimeActive,
  endOvertimeActiveWindow,
  canCancelOvertime,
  tapOvertimeBar,
  addOvertimeTicks,
  getOvertimeTicks,
  getOvertimeTickGoal,
  isUpgradeButtonEnabled,
  BTN_W,
  BTN_H,
  getUpgradeCost,
  resolveButtonFloor,
  getButtonMirrors,
} from "../upgradeButton";

import {
  isScreenFrozen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import {
  increaseIncomeRate,
  UPGRADE_MILESTONE_STEP,
  hitTestIncomeBar,
  triggerIncomeBarPress,
  currentPayoutAmount,
  getIncomeBarCenter,
  queueOvertimeTickDelivery,
  deliverOvertimeTicks,
  clearOvertimeTickDelivery,
} from "../incomePanel";
import { spendTotalIncome, addTotalIncome } from "../../totalIncome";

import {
  spawnCoinBurst as animateCoinBurst,
  spawnHomingCoinBurst as animateHomingCoinBurst,
} from "../coins";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";

import {
  announceEventStartClick,
  EVENT_COIN_TIMING,
} from "../../shared/floorEvents";
import { triggerLevelPop } from "../star";
import { hitTestUpgradeArrow } from "../upgradeArrow";

import {
  playSold as soundSold,
  playBloop as soundBloop,
  playCoinDrop as soundCoinDrop,
} from "../../sound";
import {
  hitTestFloorLock,
  unlockFloor,
  startFloorUnlockAnim,
  ensureLockedFloorAbove,
  getLockCenter,
  UNLOCK_OVERLAY_MS,
} from "../floorLock";
import { activateBoosted, isFloorMaxed, type Floor } from "../../gameState";
import { type BigNumber, multiply } from "../../shared/bigNumber";

const spawnCoinBurst = liveEffect(animateCoinBurst);
const spawnHomingCoinBurst = liveEffect(animateHomingCoinBurst);
// each landing coin hands the bar its share of the ticks, so the readout climbs
// in step with the coins instead of jumping on the click
const spawnOvertimeCoins = liveEffect(
  (
    floor: Floor,
    x: number,
    y: number,
    isGroundFloor: boolean,
    ticks: number,
  ) => {
    queueOvertimeTickDelivery(floor, ticks);
    let remaining = ticks;
    let coinsLeft = 0;
    coinsLeft = animateHomingCoinBurst(floor, x, y, {
      target: getIncomeBarCenter(isGroundFloor),
      ...EVENT_COIN_TIMING,
      onEachArrive: () => {
        const share = coinsLeft > 1 ? remaining / coinsLeft : remaining;
        remaining -= share;
        coinsLeft -= 1;
        deliverOvertimeTicks(floor, share);
      },
    });
  },
);
const triggerButtonPress = liveEffect(animateButtonPress);
const playSold = liveEffect(soundSold);
const playBloop = liveEffect(soundBloop);
const playCoinDrop = liveEffect(soundCoinDrop);

export interface FloorActionsDeps {
  floors: Floor[];
  backgroundCount: number;
  multiplier: BigNumber; // this building's economy scale (buildings/index.ts)
  persist: () => void;
  // gameCanvas.ts's own continuous per-frame redraw already picks up any state change
  // on the next tick, so these just need to register the new floor for hit-testing/
  // scroll bookkeeping — no manual "redraw this one floor now" plumbing needed anymore
  onFloorAdded: (floor: Floor) => void;
  createMysticBuilding: () => void;
  getCompanyValue: () => BigNumber;
  applyCompanyWideBoost: () => void;
  // converts the current visual screen center (where critFlash's "CRIT!" flash is
  // drawn) into this floor's own local coordinate space, so a coin burst can be
  // anchored there instead of at a fixed floor-local point
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number };
  getScreenAreaLocal?: ScreenAreaLocal;
  // floors currently in view, for the "Boost" event's target pick (see
  // crits/animatedCrits/events/boostEvent) — omitted off-screen (e.g. map/draft purchases), where
  // that event simply never starts
  getOnScreenFloors?: OnScreenFloors;
  // world-space rect of any floor (see crits/animatedCrits/events/swarmEvent's neighbour targets)
  getFloorRect?: FloorRectResolver;
}

// re-exported for floors/index.ts's facade — the canonical check now lives in
// upgradeButton.ts (needs it internally for its own hold-animation deflate),
// this file just reuses it for hitTestFloorHover below
export { isUpgradeButtonEnabled };

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
    (canCancelOvertime(floor, Date.now()) &&
      hitTestIncomeBar(x, y, isGroundFloor)) ||
    hitTestFloorLock(x, y, floor) ||
    hitTestUpgradeArrow(x, y, floor) ||
    hitTestWorkers(x, y, floor).length > 0
  );
}

const UPGRADE_SOUND_STEP = 100;

// one upgrade tick's worth of logic — rate increase, the small jittered coin
// burst at the button, and the every-10th-upgrade milestone burst (same one
// that halves the floor's income interval, see incomePanel.ts). Shared by a
// normal paid click and the crit branch below, which runs this exactly
// CRIT_UPGRADE_COUNT times back to back (minus the cost) — calling this once
// per simulated click, not just once total, is what makes a crit landing on a
// multiple of 10 mid-run behave identically to 5 real clicks would.
// Deliberately does NOT reroll the next crit itself — a landed tier's own
// multiplier (e.g. x125) would otherwise reroll the special-crit gateway once
// per free tick instead of once for the whole crit; only the player's own
// upgrade-button click rolls the next crit, once, after this has run its full count
// burst: only a bought upgrade bursts coins; crit rewards stay coinless
export function applyUpgradeTick(
  floor: Floor,
  isGroundFloor: boolean,
  burst = false,
): void {
  increaseIncomeRate(floor);
  if (isDetachedJobRunning()) return;
  // every 10th upgrade (the milestone that halves the income interval) the
  // level label pops; it bloops only every UPGRADE_SOUND_STEP levels
  if (floor.upgradeCount % UPGRADE_MILESTONE_STEP === 0) {
    triggerLevelPop(floor);
    if (floor.upgradeCount % UPGRADE_SOUND_STEP === 0) playBloop();
  }
  if (!burst) return;
  const center = getButtonCenter(isGroundFloor);
  // small random jitter so the burst doesn't spawn at the exact same pixel
  // every single click — a random point spanning the button's own inner width
  // on X (scaled back 25%) and half its height on Y
  const jitterX = (Math.random() - 0.5) * (BTN_W * 0.75);
  const jitterY = (Math.random() - 0.5) * (BTN_H / 2);
  spawnCoinBurst(floor, center.x + jitterX, center.y + jitterY, () => {});
}

// State-only version of the normal upgrade-button click used by automated
// buyers. It consumes an already armed crit before paying for a normal upgrade,
// exactly like the manual click path, so automated purchases cannot overwrite
// a crit without applying its reward. Each automated upgrade rolls the next
// crit, which the following automated upgrade consumes, so only a crit rolled
// on a floor's last automated upgrade is left armed.
export function performAutomatedUpgradeClick(
  deps: FloorActionsDeps,
  floor: Floor,
  isGroundFloor: boolean,
): boolean {
  if (!floor.unlocked || isFloorLocked(floor) || isFloorMaxed(floor))
    return false;
  if (isCritUpgrade(floor)) {
    return performAutomatedUpgradeAfterPayment(
      deps,
      floor,
      isGroundFloor,
      false,
    );
  }
  if (!spendTotalIncome(getUpgradeCost(floor))) return false;
  return performAutomatedUpgradeAfterPayment(deps, floor, isGroundFloor, true);
}

export function performAutomatedUpgradeAfterPayment(
  deps: FloorActionsDeps,
  floor: Floor,
  isGroundFloor: boolean,
  paid: boolean,
): boolean {
  if (!floor.unlocked) return false;
  if (isCritUpgrade(floor)) {
    const tier = getCritTier(floor)!;
    consumeCritUpgrade(floor);
    rollCritUpgrade(floor, false);
    applyFloorCrit(deps, floor, tierOnlyCrit(tier), false);
    deps.persist();
    return true;
  }
  if (!paid && !spendTotalIncome(getUpgradeCost(floor))) return false;
  applyUpgradeTick(floor, isGroundFloor, true);
  rollCritUpgrade(floor, false);
  deps.persist();
  return true;
}

// State-only version of a manual floor-unlock click. Floor purchases use their
// dedicated one-shot crit roll rather than the next-upgrade telegraph.
export function performAutomatedFloorUnlock(
  deps: FloorActionsDeps,
  floor: Floor,
  prepaid = false,
): boolean {
  if (
    floor.unlocked ||
    isFloorLocked(floor) ||
    (!prepaid && !spendTotalIncome(floor.unlockCost))
  )
    return false;
  unlockFloor(floor);
  ensureLockedFloorAbove({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
  const buyTier = rollFloorBuyCrit(false);
  if (buyTier) {
    floor.critMultiplierTier = pickHigherCritTier(
      floor.critMultiplierTier,
      buyTier.tier,
    );
    applyFloorCrit(deps, floor, buyTier, false);
    critNow(deps, floor, false);
  }
  deps.persist();
  return true;
}

// everything a floor unlock does once it's paid for (or granted by an event);
// fromEvent (the Unlock event) also raises the floor's permanent tier to a
// landed crit's and slams its price before dropping the overlay, where a
// click just bursts coins
export function completeFloorUnlock(
  deps: FloorActionsDeps,
  floor: Floor,
  fromEvent = false,
): void {
  const { floors } = deps;
  unlockFloor(floor);
  if (fromEvent) startFloorUnlockAnim(floor);
  playSold();
  ensureLockedFloorAbove({
    floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
  const buyTier = rollFloorBuyCrit();
  if (buyTier) {
    // an armed "force bonus tier" test button (see forceBonusTierCritProc)
    // always arms buildings[activeBuildingIndex][0] (main.ts's own test
    // wiring — the only floor a test button can address), which is never
    // the actual locked `floor` being unlocked here (floor 0 always
    // starts unlocked already) — so this searches the WHOLE building
    // instead of just this one floor, unlike the plain-click branch
    // (where the armed floor and the clicked floor are always the
    // same, so a direct getBonusTierCrit(floor) there is correct)
    const forcedBonusTierFloor = floors.find((f) => getBonusTierCrit(f));
    if (forcedBonusTierFloor) {
      buyTier.bonusTier = getBonusTierCrit(forcedBonusTierFloor)!;
      consumeBonusTierCrit(forcedBonusTierFloor);
    }
    if (fromEvent) {
      floor.critMultiplierTier = pickHigherCritTier(
        floor.critMultiplierTier,
        buyTier.tier,
      );
    }
    applyFloorCrit(deps, floor, buyTier);
    critNow(deps, floor);
  }
  const center = getLockCenter();
  const burst = () => spawnCoinBurst(floor, center.x, center.y, () => {});
  // an event unlock bursts as its slammed price and overlay disappear
  if (fromEvent) setTimeout(burst, UNLOCK_OVERLAY_MS);
  else burst();
}
// one Sale-click payout for `floor`: a full bar of its current payout (times
// multiplier) straight to the total — never into floor.incomeAmount, or each
// click would raise the rate the next one reads — with coins flying from its button
export function paySaleClick(
  floor: Floor,
  isGroundFloor: boolean,
  multiplier: number,
): void {
  const gained = multiply(currentPayoutAmount(floor, Date.now()), multiplier);
  addTotalIncome(gained);
  const center = getButtonCenter(isGroundFloor);
  const jitterX = (Math.random() - 0.5) * (BTN_W * 0.75);
  const jitterY = (Math.random() - 0.5) * (BTN_H / 2);
  spawnHomingCoinBurst(floor, center.x + jitterX, center.y + jitterY, {
    ...EVENT_COIN_TIMING,
    onEachArrive: pulseHudTotalFlash,
  });
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
  if (
    isScreenFrozen() ||
    isFloorLocked(floor) ||
    (isDetachedJobPending() && !isDetachedJobRunning())
  )
    return;
  const { floors, multiplier, persist, getScreenCenterLocal } = deps;

  if (
    canCancelOvertime(floor, Date.now()) &&
    hitTestIncomeBar(x, y, isGroundFloor)
  ) {
    tapOvertimeBar(floor, Date.now());
    persist();
    triggerIncomeBarPress(floor);
    return;
  }

  if (hitTestFloorLock(x, y, floor)) {
    if (spendTotalIncome(floor.unlockCost)) {
      completeFloorUnlock(deps, floor);
      // after the celebration, not before: Deja Vu grants its follow-up procs'
      // rewards synchronously from in there, and they'd otherwise miss this save
      persist();
    }
    return;
  }

  if (hitTestUpgradeButton(x, y, isGroundFloor) && floor.unlocked) {
    // a mirrored clone (see crits/animatedCrits/events/swarmEvent) clicks its source button
    const source = resolveButtonFloor(floor);
    if (source !== floor) {
      const sourceIsGround = floors.indexOf(source) === 0;
      const center = getButtonCenter(sourceIsGround);
      handleFloorClick(deps, source, center.x, center.y, sourceIsGround);
      return;
    }
    announceEventStartClick(floor, Date.now());
    // "Hunt" event (see crits/animatedCrits/events/huntEvent): free like Boost below, falling
    // through as a normal click if the mouse has left the screen meanwhile
    if (isHuntEventArmed(floor)) {
      disarmHuntEvent(floor);
      if (startHuntEvent(floor, isGroundFloor, deps.getOnScreenFloors)) {
        triggerButtonPress(floor);
        playCoinDrop();
        return;
      }
    }
    // "Boost" event (see crits/animatedCrits/events/boostEvent): free, and leaves any armed crit
    // for the next click. If no on-screen worker is left to pick, the button
    // just disarms and this click falls through as a normal one
    if (isBoostEventArmed(floor)) {
      disarmBoostEvent(floor);
      if (
        startBoostEvent(floor, isGroundFloor, deps.getOnScreenFloors, persist)
      ) {
        triggerButtonPress(floor);
        playCoinDrop();
        return;
      }
    }
    // "Union" event (see crits/animatedCrits/events/unionEvent): free like Boost, falling through
    // as a normal click if the floor no longer has workers to merge
    if (isUnionEventArmed(floor)) {
      disarmUnionEvent(floor);
      if (startUnionEvent(floor, persist)) {
        triggerButtonPress(floor);
        playCoinDrop();
        return;
      }
    }
    // "Swarm" event (see crits/animatedCrits/events/swarmEvent): free, starts the timed swarm
    // sale and leaves any armed crit for the next click
    if (isSwarmEventArmed(floor)) {
      disarmSwarmEvent(floor);
      triggerSwarmSale(floor);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      return;
    }
    // an active swarm sale: every click is a Sale click on this button and
    // each of its mirrored clones (see crits/animatedCrits/events/swarmEvent)
    if (isSwarmSaleActive(floor, Date.now())) {
      const tier = getCritTier(floor);
      if (tier) consumeCritUpgrade(floor);
      const multiplier = tier ? CRIT_TIER_CONFIG[tier].multiplier : 1;
      paySaleClick(floor, isGroundFloor, multiplier);
      for (const clone of getButtonMirrors(floor)) {
        paySaleClick(clone.floor, clone.isGroundFloor, multiplier);
      }
      rollCritUpgrade(floor, false);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      if (tier) triggerCritCelebration(floor, tier, getScreenCenterLocal);
      return;
    }
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
      paySaleClick(
        floor,
        isGroundFloor,
        tier ? CRIT_TIER_CONFIG[tier].multiplier : 1,
      );
      // re-arm the next crit for AFTER this sale ends without letting it also
      // roll a piggyback proc while a special event is already active (see
      // crits/critTypes' rollCrit's own allowSpecialProcs param)
      rollCritUpgrade(floor, false);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      if (tier) triggerCritCelebration(floor, tier, getScreenCenterLocal);
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
      const ticksAdded = getOvertimeTicks(floor) - ticksBefore;
      // re-arm the next crit for AFTER this overtime run ends without
      // letting it also roll a piggyback proc while a special event is
      // already active (see crits/critTypes' rollCrit's own
      // allowSpecialProcs param)
      rollCritUpgrade(floor, false);
      // filling the gauge all the way promotes this floor's own PERMANENT crit
      // tier one step (null -> crit -> mega -> ultra, capped at ultra) and ends
      // the event once the gauge is filled — only
      // fires the instant it crosses the goal, not on every click while already
      // maxed, so a long drain-tail re-trigger chain can't over-promote past ultra
      let goalReached = false;
      const goal = getOvertimeTickGoal(floor);
      if (getOvertimeTicks(floor) >= goal) {
        goalReached = true;
        floor.overtimeGoal = goal;
        const previousTier = floor.critMultiplierTier;
        const promotedTier = nextCritTier(previousTier);
        if (promotedTier !== previousTier)
          promoteTierKeepingLevel(
            floor,
            floors.indexOf(floor) + 1,
            multiplier,
            promotedTier,
          );
        endOvertimeActiveWindow(floor, Date.now());
        clearOvertimeTickDelivery(floor);
      }
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      if (goalReached) {
        // revealed as the bar jumps (see announceEventEnded)
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
      if (goalReached || ticksAdded <= 0) {
        spawnCoinBurst(floor, center.x + jitterX, center.y + jitterY, () => {});
      } else {
        spawnOvertimeCoins(
          floor,
          center.x + jitterX,
          center.y + jitterY,
          isGroundFloor,
          ticksAdded,
        );
      }
      return;
    }
    // "Snowball" is no longer a timed click event (see crits/critTypes'
    // applySnowballCrit) — it's now a flat, instant reward applied straight
    // from the crit-consumption branches below, so there's no click branch
    // here anymore.
    // "Frozen" (see crits/critTypes' isFrozenCrit) is likewise no longer a
    // special click branch — it just locks this floor's own upgradeCost from
    // growing for FROZEN_DURATION_MS (see incomePanel.ts's increaseIncomeRate),
    // so a click here falls straight through to the normal crit/paid-upgrade
    // branches below, at whatever price is currently frozen
    // the slot-machine jackpot moment: free, costs nothing, applies that tier's
    // upgrade count at once, and celebrates with the same shake/flash/sfx/bursts
    // treatment as any other crit (see triggerCritCelebration) — mega/ultra are
    // the rarer, bigger-payout tiers (see upgradeButton.ts's rollCritUpgrade).
    // A "chain crit" (see isChainCrit) additionally extends this same tier's
    // upgrade count up through the building, and a "boost crit" (see
    // isBoostCrit) additionally free-activates this floor's own workers —
    // neither ever changes the button's own pre-click appearance, both only
    // read the flag right here, at the moment the already-armed tier is spent
    if (isFloorMaxed(floor)) return;
    if (isCritUpgrade(floor)) {
      const tier = getCritTier(floor)!;
      const procs = readCritProcs(floor);
      const bonusTier = getBonusTierCrit(floor);
      const critUp = isCritUp(floor);
      const critDown = isCritDown(floor);
      const mergeCrit = getMergeCrit(floor);
      const floorCrit = getFloorCrit(floor);
      const eventContext = eventProcContext(deps, isGroundFloor);
      const cover = getClaimedEventCover(floor);
      const carriesEvent = takeClaimedEventProc(floor);
      consumeCritUpgrade(floor);
      // rolled before the rewards so a Golden/Silver Ticket arms the roll after this one
      rollCritUpgrade(floor, true, eventContext);
      // an event covering this crit reveals and pays its tier once it plays out
      const covered =
        carriesEvent &&
        cover !== null &&
        armTakenEventProc(floor, { ...eventContext, critTier: tier });
      if (covered) {
        triggerButtonPress(floor);
      } else {
        applyFloorCrit(
          deps,
          floor,
          Object.assign(procs, {
            tier,
            bonusTier,
            critUp,
            critDown,
            mergeCrit,
            floorCrit,
          }),
        );
        // the special event this crit carried instead of a special crit
        if (carriesEvent && !cover) armTakenEventProc(floor, eventContext);
      }
      // after the celebration, not before: Deja Vu grants its follow-up procs'
      // rewards synchronously from in there, and they'd otherwise miss this save
      persist();
      return;
    }
    if (spendTotalIncome(getUpgradeCost(floor))) {
      applyUpgradeTick(floor, isGroundFloor, true);
      rollCritUpgrade(floor, true, eventProcContext(deps, isGroundFloor));
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
    // clicking a worker only (re)activates that specific worker's boost/15s timer.
    // Date.now()-based (not performance.now()) so it matches incomePanel.ts's
    // persisted, Date.now()-based cycle tracking that reads the same boost state
    activateBoosted(floor, workerIndex, Date.now());
    persist();
  }
}
