import {
  hitTestWorkers,
  clickWorker,
  getWorkerCenter,
  applyBoostAll,
  triggerJumpAll,
  getRenderedWorkerCount,
  MAX_RENDERED_WORKERS,
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
  isBounceCrit,
  isExplosionCrit,
  isBootyCrit,
  isUpgradeCrit,
  isPeppermintCrit,
  isHeavenlyCrit,
  isPairCrit,
  isThreeOfAKindCrit,
  isFourOfAKindCrit,
  isFullHouseCrit,
  isRoyalFlushCrit,
  isTickTockCrit,
  isChairGiveawayCrit,
  isSuppliesGiveawayCrit,
  isWinterSaleCrit,
  isSpringSaleCrit,
  isSummerSaleCrit,
  isAutumnSaleCrit,
  isHalloweenSaleCrit,
  isEasterSaleCrit,
  isSunshineCrit,
  isSnowdayCrit,
  isFastForwardCrit,
  isFrozenCrit,
  isSnowballCrit,
  isFreeSaleCrit,
  isPaydayCrit,
  isGoldStandardCrit,
  isNightShiftCrit,
  isInternCrit,
  isUnionBossCrit,
  isRushHourCrit,
  isGoldenTicketCrit,
  isSilverTicketCrit,
  isGoldenParachuteCrit,
  isPayoutCrit,
  isGrandOpeningCrit,
  isFullyStaffedCrit,
  isEspressoShotCrit,
  isDejaVuCrit,
  getBonusTierCrit,
  consumeBonusTierCrit,
  SEASONAL_SALE_DISCOUNT_MULTIPLIER,
  HALLOWEEN_SALE_DISCOUNT_MULTIPLIER,
  EASTER_SALE_DISCOUNT_MULTIPLIER,
  POKER_HAND_CRIT_COUNTS,
  consumeCritUpgrade,
  rollCritUpgrade,
  rollFloorBuyCrit,
  pickHigherCritTier,
  nextCritTier,
  isSaleActive,
  triggerSaleBoost,
  isOvertimeActive,
  triggerFrozenCrit,
  triggerRushHourCrit,
  armGuaranteedUltraCrit,
  armGuaranteedMegaCrit,
  endOvertimeActiveWindow,
  isOvertimeDraining,
  getOvertimeCost,
  retriggerOvertimeBoost,
  addOvertimeTicks,
  getOvertimeTicks,
  getOvertimeTickGoal,
  resetOvertimeTicks,
  isUpgradeButtonEnabled,
  type CritTier,
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  CHAIN_CRIT_CONTINUE_CHANCE,
  BOUNCE_CRIT_CONTINUE_CHANCE,
  EXPLOSION_CRIT_CONTINUE_CHANCE,
  BTN_W,
  BTN_H,
} from "../upgradeButton";
import {
  increaseIncomeRate,
  UPGRADE_MILESTONE_STEP,
  hitTestIncomeBar,
  getIncomeBarCenter,
  triggerIncomeBarPress,
  currentPayoutAmount,
} from "../incomePanel";
import {
  spendTotalIncome,
  addTotalIncome,
  getTotalIncome,
  getCompanyIncomeRatePerSecond,
  getAllCompaniesTotalIncome,
  getAllCompaniesUpgradesValue,
} from "../../totalIncome";
import { getActiveCompanyIndex } from "../../company";
import { spawnCoinBurst } from "../coins";
import { spawnFloatingCoins } from "../coinFloat";
import { spawnIncomeFloatText } from "../incomeFloatText";
import { getUpgradeIndicatorCenter } from "../star";
import { hitTestUpgradeArrow } from "../upgradeArrow";
import { playSold, playBloop, playCoinDrop } from "../../sound";
import {
  hitTestFloorLock,
  unlockFloor,
  unlockAllFloors,
  ensureLockedFloorAbove,
  getLockCenter,
  MAX_FLOORS_PER_BUILDING,
} from "../floorLock";
import {
  activateBoosted,
  BOOST_DURATION_MS,
  type Floor,
} from "../../gameState";
import { type BigNumber, ZERO, add, multiply } from "../../shared/bigNumber";
import { triggerCritCelebration } from "./critCelebration";

// "peppermint crit" (see shared/critTypes' isPeppermintCrit): promotes every
// OTHER unlocked floor in the building one tier step at once (same
// nextCritTier promotion upgrade crit uses on a single floor, just applied
// building-wide to alternating floors) — unlocked floors always form a
// contiguous prefix of `floors`, so striding by 2 over the whole array and
// skipping any not-yet-unlocked entries is equivalent to "every other of all
// unlocked floors"
function applyPeppermintCrit(floors: Floor[]): void {
  for (let i = 0; i < floors.length; i += 2) {
    const floor = floors[i];
    if (floor.unlocked) {
      floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    }
  }
}

// "heavenly crit" (see shared/critTypes' isHeavenlyCrit): the single biggest
// reward in the game — unlocks every remaining floor in the building for
// free (reusing the exact same unlockAllFloors loop a paid "unlock all"
// purchase uses), promotes EVERY floor (including the ones just unlocked)
// straight to the strongest tier (CRIT_TIER_ORDER[0], rarest-first so index 0
// is always the top), then grants that tier's own free-upgrade count to every
// floor once — the same reward shape a real crit of that tier landing on a
// floor already grants, just applied building-wide instead of to one floor
function applyHeavenlyCrit(deps: FloorActionsDeps): void {
  unlockAllFloors({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
  const maxTier = CRIT_TIER_ORDER[0];
  const count = CRIT_TIER_CONFIG[maxTier].multiplier;
  deps.floors.forEach((floor, index) => {
    floor.critMultiplierTier = maxTier;
    // cheap direct rate bump instead of replaying the full applyUpgradeTick
    // (coin burst + milestone check) up to `count` times per floor — with up
    // to ~20 floors this would otherwise be thousands of bursts/rerolls for
    // one proc; still rolls this floor's own next crit exactly once
    for (let i = 0; i < count; i++) {
      increaseIncomeRate(floor);
    }
    rollCritUpgrade(floor);
    const center = getButtonCenter(index === 0);
    spawnCoinBurst(floor, center.x, center.y, () => {});
  });
}

// "pair"/"three of a kind"/"four of a kind"/"full house" crits (see
// shared/critTypes's isPairCrit etc.): promotes `count` floors' own
// permanent crit tier one step, starting AT the floor that actually landed
// the proc and walking upward \u2014 same auto-unlock-as-it-goes behavior
// applyChainCrit's walk uses (a locked floor in the path is unlocked for
// free instead of blocking the walk), just a fixed count instead of a
// probabilistic continue-chance. `count` always comes from shared/critTypes'
// POKER_HAND_CRIT_COUNTS \u2014 the one place that number is ever named
function applyPokerHandCrit(
  deps: ChainCritDeps,
  startIndex: number,
  count: number,
): void {
  const { floors, backgroundCount, multiplier, onFloorAdded } = deps;
  for (
    let promoted = 0, index = startIndex;
    promoted < count && index < floors.length;
    promoted++, index++
  ) {
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
    target.critMultiplierTier = nextCritTier(target.critMultiplierTier);
  }
}

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

// one upgrade tick's worth of logic — rate increase, the small jittered coin
// burst at the button, and the every-10th-upgrade milestone burst (same one
// that halves the floor's income interval, see incomePanel.ts). Shared by a
// normal paid click and the crit branch below, which runs this exactly
// CRIT_UPGRADE_COUNT times back to back (minus the cost) — calling this once
// per simulated click, not just once total, is what makes a crit landing on a
// multiple of 10 mid-run behave identically to 5 real clicks would.
// Deliberately does NOT reroll the next crit itself — a landed tier's own
// multiplier (e.g. x125) would otherwise reroll the special-crit gateway once
// per free tick instead of once for the whole crit; every call site rolls the
// next crit exactly once on its own, after this has run its full count
function applyUpgradeTick(floor: Floor, isGroundFloor: boolean): void {
  increaseIncomeRate(floor);
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
// separate single-floor copy of that loop. durationMs (default the normal
// boost length) lets the Sunshine crit below grant a longer-lasting boost
// through this exact same reward function
function applyFloorBoost(floors: Floor[], durationMs?: number): void {
  applyBoostAll(floors, durationMs);
  triggerJumpAll(floors, Date.now());
}

// "sunshine crit" (see shared/critTypes' isSunshineCrit): identical reward to
// boost above, just twice the normal boost duration
const SUNSHINE_BOOST_DURATION_MS = BOOST_DURATION_MS * 2;
function applySunshineCrit(floors: Floor[]): void {
  applyFloorBoost(floors, SUNSHINE_BOOST_DURATION_MS);
}

// "snowday crit" (see shared/critTypes' isSnowdayCrit): identical reward to
// sunshine above, just three times the normal boost duration
const SNOWDAY_BOOST_DURATION_MS = BOOST_DURATION_MS * 3;
function applySnowdayCrit(floors: Floor[]): void {
  applyFloorBoost(floors, SNOWDAY_BOOST_DURATION_MS);
}

// "night shift crit" (see shared/critTypes' isNightShiftCrit): same
// building-wide free-boost reward as boost/sunshine/snowday above, but its
// own SHORTER duration — half the normal boost length. Also, for the same
// shorter window, activates a "virtual" boosted worker slot one past each
// unlocked floor's own last rendered worker index: countBoostedWorkers
// (gameState.ts) counts every slot regardless of rendered-worker cap, so
// this bumps incomePanel.ts's boost-speed exponent by 1/MAX_RENDERED_WORKERS
// extra — the same effect a genuine +1 boosted worker would have — while
// getRenderedWorkerCount-bounded drawing never renders it, since real
// workers only ever occupy indices below that count
const NIGHT_SHIFT_BOOST_DURATION_MS = Math.round(BOOST_DURATION_MS / 2);
function applyNightShiftCrit(floors: Floor[]): void {
  applyFloorBoost(floors, NIGHT_SHIFT_BOOST_DURATION_MS);
  const now = Date.now();
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    activateBoosted(
      floor,
      getRenderedWorkerCount(floor),
      now,
      NIGHT_SHIFT_BOOST_DURATION_MS,
    );
  }
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
// bounce/explosion procs pass their own dedicated chance instead, see their
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

// "bounce crit" (see shared/critTypes's isBounceCrit): unlike chain/explosion,
// ONLY ever cascades downward from the floor that actually crit — like a ball
// bouncing down a staircase, never up. Same downward-walk shape as
// applyExplosionCrit's own downward half; no auto-unlock handling needed
// since a building's floors are always unlocked contiguously from the ground
// up, so anything below an already-unlocked floor is already unlocked too
export function applyBounceCrit(
  deps: ChainCritDeps,
  centerIndex: number,
  applyToFloor: (floor: Floor, isGroundFloor: boolean) => void,
  continueChance: number = BOUNCE_CRIT_CONTINUE_CHANCE,
): void {
  const { floors } = deps;
  let index = centerIndex - 1;
  for (;;) {
    if (index < 0) return;
    applyToFloor(floors[index], index === 0);
    index -= 1;
    if (Math.random() >= continueChance) return;
  }
}

// "tick tock crit" (see shared/critTypes's isTickTockCrit): instantly credits
// every unlocked floor extra payouts' worth of income at its own current
// rate, WITHOUT touching floor.lastCollectedAt (see incomePanel.ts's
// currentPayoutAmount) — each floor's own bar keeps ticking from exactly the
// same progress it was already at, it just also gets paid `multiplier`
// payouts right now. `multiplier` defaults to tick tock's own 2x; "fast
// forward" below reuses this exact function with a steeper 4x
function applyTickTockCrit(floors: Floor[], multiplier = 2): void {
  const now = Date.now();
  let total: BigNumber = ZERO;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    total = add(total, multiply(currentPayoutAmount(floor, now), multiplier));
  }
  addTotalIncome(total);
}

// "fast forward crit" (see shared/critTypes's isFastForwardCrit): same
// instant-income reward as tick tock above, just a steeper multiplier
const FAST_FORWARD_PAYOUT_MULTIPLIER = 4;
function applyFastForwardCrit(floors: Floor[]): void {
  applyTickTockCrit(floors, FAST_FORWARD_PAYOUT_MULTIPLIER);
}

// "frozen crit" (see shared/critTypes's isFrozenCrit): no instant payout —
// just starts upgradeButton.ts's own timed window on this ONE floor (see
// triggerFrozenCrit/isFrozenActive), during which incomePanel.ts's
// increaseIncomeRate skips growing this floor's own upgradeCost entirely —
// upgrades keep costing whatever the price already was when the window
// started, for FROZEN_DURATION_MS
function applyFrozenCrit(floor: Floor): void {
  triggerFrozenCrit(floor);
}

// "snowball crit" (see shared/critTypes's isSnowballCrit): a flat,
// not-tier-scaled proc, same instant-income shape as tick tock/fast forward
// — but instead of a fixed multiplier, it pays every unlocked floor 1 extra
// payout's worth of income at its own current rate, multiplied by however
// many floors are currently unlocked (the more floors owned, the bigger the
// snowball)
function applySnowballCrit(floors: Floor[]): void {
  const unlockedCount = floors.filter((f) => f.unlocked).length;
  applyTickTockCrit(floors, unlockedCount);
}

// "free sale crit" (see shared/critTypes's isFreeSaleCrit): no reward of its
// own — just calls the SAME triggerSaleBoost hud/boostMenu.ts's paid
// purchase already uses, starting an ordinary "Sale" event on this ONE
// floor for free (own window/button state/payout math all reused as-is)
function applyFreeSaleCrit(floor: Floor): void {
  triggerSaleBoost(floor);
}

// "Grand Opening" crit (see shared/critTypes's isGrandOpeningCrit): unlocks
// every currently-locked floor in this building for free, preserving each
// floor's own existing tier/rate/upgrade state (unlike heavenly, which also
// maxes tiers and grants upgrades)
function applyGrandOpeningCrit(deps: FloorActionsDeps): void {
  unlockAllFloors({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
}

// "Fully Staffed" crit (see shared/critTypes's isFullyStaffedCrit): fills
// every unlocked floor to the existing rendered-worker cap and grants every
// unlocked floor a manager.
// This changes the same state fields as the paid menu actions, but skips all
// spending because the reward is free.
function applyFullyStaffedCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    floor.workerCount = MAX_RENDERED_WORKERS;
    floor.hasManager = true;
  }
}

// "Espresso Shot" crit (see shared/critTypes's isEspressoShotCrit): applies
// the normal all-worker boost for its regular 15-second duration
function applyEspressoShotCrit(floors: Floor[]): void {
  applyFloorBoost(floors);
}

// "Deja Vu" crit (see shared/critTypes's isDejaVuCrit): picks one of the
// existing crit tiers uniformly, then applies that tier's free-upgrade batch
// twice without rolling another crit or piggyback proc.
function randomDejaVuTier(): CritTier {
  return CRIT_TIER_ORDER[Math.floor(Math.random() * CRIT_TIER_ORDER.length)];
}

function applyDejaVuCrit(floor: Floor, isGroundFloor: boolean): void {
  const count = CRIT_TIER_CONFIG[randomDejaVuTier()].multiplier;
  for (let repetition = 0; repetition < 2; repetition++) {
    for (let i = 0; i < count; i++) {
      applyUpgradeTick(floor, isGroundFloor);
    }
  }
}

// "payday crit" (see shared/critTypes's isPaydayCrit): a flat one-time
// effect, same shape as booty — triples the currently active company's
// total income once
function applyPaydayCrit(): void {
  addTotalIncome(multiply(getTotalIncome(), 2));
}

// "gold standard crit" (see shared/critTypes's isGoldStandardCrit): same
// flat one-time effect as payday, just a steeper multiplier — quadruples
// the currently active company's total income once
function applyGoldStandardCrit(): void {
  addTotalIncome(multiply(getTotalIncome(), 3));
}

// "special crit crit" bonus tier (see shared/critTypes's getBonusTierCrit):
// once ANY piggyback proc lands, it gets its own independent shot at this
// bonus tier — when it hits, multiplies the currently active company's total
// income by that tier's own multiplier (5x/25x/125x), same "add
// (multiplier-1)x more" shape payday/gold standard already use, on top of
// whatever the proc(s) it rode in on already granted
function applyBonusTierCrit(bonusTier: CritTier): void {
  addTotalIncome(
    multiply(getTotalIncome(), CRIT_TIER_CONFIG[bonusTier].multiplier - 1),
  );
}

// "Chair Giveaway"/"Supplies Giveaway" crits (see shared/critTypes's isChairGiveawayCrit/
// isSuppliesGiveawayCrit): grant the floor being upgraded its one-time office
// chairs/supplies purchase for free (same flags hud/upgradeMenu's own paid
// buyOfficeChairs/buyOfficeSupplies set) — a no-op if the floor already has it
function applyChairGiveawayCrit(floor: Floor): void {
  floor.hasOfficeChairs = true;
}

function applySuppliesGiveawayCrit(floor: Floor): void {
  floor.hasOfficeSupplies = true;
}

// "Intern"/"Union Boss" crits (see shared/critTypes's isInternCrit/
// isUnionBossCrit): grant the floor being upgraded one free worker/manager
// (same fields hud/upgradeMenu's own paid buyWorker/buyManager set), for
// free — Intern is capped at MAX_RENDERED_WORKERS (same cap buyWorker
// itself enforces), Union Boss is a no-op if the floor already has a manager
function applyInternCrit(floor: Floor): void {
  if (floor.workerCount < MAX_RENDERED_WORKERS) floor.workerCount += 1;
}

function applyUnionBossCrit(floor: Floor): void {
  floor.hasManager = true;
}

// "Rush Hour" crit (see shared/critTypes's isRushHourCrit): no instant
// payout — just starts the building-wide timed window (see
// triggerRushHourCrit/isRushHourActive) during which every unlocked floor's
// own income timer is capped at RUSH_HOUR_INTERVAL_SECONDS (see
// incomePanel.ts's currentSpeedMultiplier)
function applyRushHourCrit(floors: Floor[]): void {
  triggerRushHourCrit(floors);
}

// "Golden Ticket" crit (see shared/critTypes's isGoldenTicketCrit): no
// instant payout — just arms upgradeButton.ts's own armGuaranteedUltraCrit
// so the very next rollCritUpgrade call on this floor is forced straight to
// ultra, bypassing every tier/proc chance entirely for that one roll
function applyGoldenTicketCrit(floor: Floor): void {
  armGuaranteedUltraCrit(floor);
}

// "Silver Ticket" crit (see shared/critTypes's isSilverTicketCrit): same
// shape as Golden Ticket above, but forces the very next rollCritUpgrade
// call on this floor to mega instead
function applySilverTicketCrit(floor: Floor): void {
  armGuaranteedMegaCrit(floor);
}

// "Golden Parachute" crit (see shared/critTypes's isGoldenParachuteCrit): a
// flat, not-tier-scaled instant payout — unlike payday/gold standard (which
// multiply the ALREADY-BANKED total), this pays out GOLDEN_PARACHUTE_SECONDS
// worth of the currently active company's own combined income rate across
// EVERY one of its buildings (see totalIncome.ts's
// getCompanyIncomeRatePerSecond), so it's worth the same regardless of how
// much the company has banked up so far
const GOLDEN_PARACHUTE_SECONDS = 15;
function applyGoldenParachuteCrit(): void {
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  addTotalIncome(multiply(rate, GOLDEN_PARACHUTE_SECONDS));
}

// "Payout" crit (see shared/critTypes's isPayoutCrit): the biggest flat
// one-time jackpot — instantly adds the combined total income + upgrades
// value across EVERY corporation (not just the active one) to the
// currently active company's own total (see totalIncome.ts's
// getAllCompaniesTotalIncome/getAllCompaniesUpgradesValue)
function applyPayoutCrit(): void {
  addTotalIncome(
    add(getAllCompaniesTotalIncome(), getAllCompaniesUpgradesValue()),
  );
}

// "winter sale"/"spring sale"/"summer sale"/"autumn sale"/"halloween sale"
// crits (see shared/critTypes's isWinterSaleCrit etc.) — all five share this
// exact reward shape, only their icon/label/color AND discount size differ
// (halloween's own HALLOWEEN_SALE_DISCOUNT_MULTIPLIER is steeper than the 4
// seasonal ones' shared SEASONAL_SALE_DISCOUNT_MULTIPLIER, so this takes the
// discount as a param instead of hardcoding one constant): permanently cuts
// EVERY floor's own upgrade cost, worker/office chairs/supplies/manager
// costs (via Floor.priceDiscountMultiplier, folded into hud/upgradeMenu's
// getFloorPrice), AND the cost to unlock the next floor, by
// `discountMultiplier`, for every floor in the WHOLE building this roll
// happened in — including the one still-locked floor waiting at the top (its
// own unlockCost is a real, not-yet-paid price too, and floors/index.ts's
// ensureLockedFloorAbove reads priceDiscountMultiplier back off the ground
// floor to keep every FUTURE queued floor discounted the same way, so
// repeated procs really do stack building-wide forever, not just for floors
// that already existed)
function applySeasonalSaleCrit(
  floors: Floor[],
  discountMultiplier: number,
): void {
  for (const floor of floors) {
    floor.priceDiscountMultiplier *= discountMultiplier;
    if (floor.unlocked) {
      floor.upgradeCost = multiply(floor.upgradeCost, discountMultiplier);
    } else {
      floor.unlockCost = multiply(floor.unlockCost, discountMultiplier);
    }
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
        // an armed "force bonus tier" test button (see forceBonusTierCritProc)
        // always arms buildings[activeBuildingIndex][0] (main.ts's own test
        // wiring — the only floor a test button can address), which is never
        // the actual locked `floor` being unlocked here (floor 0 always
        // starts unlocked already) — so this searches the WHOLE building
        // instead of just this one floor, unlike the plain-click branch
        // below (where the armed floor and the clicked floor are always the
        // same, so a direct getBonusTierCrit(floor) there is correct)
        const forcedBonusTierFloor = floors.find((f) => getBonusTierCrit(f));
        if (forcedBonusTierFloor) {
          buyTier.bonusTier = getBonusTierCrit(forcedBonusTierFloor)!;
          consumeBonusTierCrit(forcedBonusTierFloor);
        }
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
        // bounce crit: the same tier-promotion reward as chain above, but
        // cascading downward from the floor just bought/unlocked instead of
        // up — like a ball bouncing down the stairs, never up — with its own
        // BOUNCE_CRIT_CONTINUE_CHANCE odds
        if (buyTier.bounce) {
          applyBounceCrit(
            deps,
            floors.indexOf(floor),
            (target) => {
              target.critMultiplierTier = pickHigherCritTier(
                target.critMultiplierTier,
                buyTier.tier,
              );
            },
            BOUNCE_CRIT_CONTINUE_CHANCE,
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
        // upgrade crit: promotes THIS floor's own permanent tier one further
        // step beyond whatever it was just set to above
        if (buyTier.upgrade) {
          floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
        }
        // peppermint crit: same flat one-time effect again, but promotes every
        // OTHER unlocked floor across the whole building at once
        if (buyTier.peppermint) applyPeppermintCrit(floors);
        // heavenly crit: the biggest reward of all — unlocks every remaining
        // floor, maxes every floor's tier, and grants each one a full
        // max-tier free-upgrade batch
        if (buyTier.heavenly) applyHeavenlyCrit(deps);
        // pair/three of a kind/four of a kind/full house crits: promote a
        // fixed number of floors' own permanent tier one step, starting at
        // the floor just bought/unlocked (see POKER_HAND_CRIT_COUNTS)
        if (buyTier.pair) {
          applyPokerHandCrit(
            deps,
            floors.indexOf(floor),
            POKER_HAND_CRIT_COUNTS.pair,
          );
        }
        if (buyTier.threeOfAKind) {
          applyPokerHandCrit(
            deps,
            floors.indexOf(floor),
            POKER_HAND_CRIT_COUNTS.threeOfAKind,
          );
        }
        if (buyTier.fourOfAKind) {
          applyPokerHandCrit(
            deps,
            floors.indexOf(floor),
            POKER_HAND_CRIT_COUNTS.fourOfAKind,
          );
        }
        if (buyTier.fullHouse) {
          applyPokerHandCrit(
            deps,
            floors.indexOf(floor),
            POKER_HAND_CRIT_COUNTS.fullHouse,
          );
        }
        // royal flush crit: unlike the other poker-hand crits' fixed count,
        // this promotes EVERY floor from the one just bought/unlocked all
        // the way up to the building's own cap (MAX_FLOORS_PER_BUILDING is
        // always a big enough count to reach it) — auto-unlocking as it goes
        if (buyTier.royalFlush) {
          applyPokerHandCrit(
            deps,
            floors.indexOf(floor),
            MAX_FLOORS_PER_BUILDING,
          );
        }
        // tick tock crit: instantly pays every unlocked floor twice at its
        // own current rate, without disturbing any floor's own bar progress
        if (buyTier.tickTock) applyTickTockCrit(floors);
        // Chair Giveaway/Supplies Giveaway crits: free one-time office chairs/
        // supplies purchase for the floor just bought/unlocked
        if (buyTier.chairGiveaway) applyChairGiveawayCrit(floor);
        if (buyTier.suppliesGiveaway) applySuppliesGiveawayCrit(floor);
        // Intern/Union Boss crits: free one-time worker/manager for the
        // floor just bought/unlocked
        if (buyTier.intern) applyInternCrit(floor);
        if (buyTier.unionBoss) applyUnionBossCrit(floor);
        // rush hour crit: caps every unlocked floor's own income timer at
        // RUSH_HOUR_INTERVAL_SECONDS, building-wide, for its own duration
        if (buyTier.rushHour) applyRushHourCrit(floors);
        // golden ticket crit: guarantees this floor's very next crit lands
        // ultra, no reward of its own
        if (buyTier.goldenTicket) applyGoldenTicketCrit(floor);
        // silver ticket crit: guarantees this floor's very next crit lands
        // mega, no reward of its own
        if (buyTier.silverTicket) applySilverTicketCrit(floor);
        // golden parachute crit: instantly pays 15s of the active company's
        // own combined income rate, no matter how much it's already banked
        if (buyTier.goldenParachute) applyGoldenParachuteCrit();
        // payout crit: instantly adds every corporation's own combined
        // income + upgrades value, the biggest flat one-time jackpot
        if (buyTier.payout) applyPayoutCrit();
        // grand opening crit: unlocks every remaining locked floor in this
        // building for free
        if (buyTier.grandOpening) applyGrandOpeningCrit(deps);
        if (buyTier.fullyStaffed) applyFullyStaffedCrit(floors);
        if (buyTier.espressoShot) applyEspressoShotCrit(floors);
        if (buyTier.dejaVu) applyDejaVuCrit(floor, floors.indexOf(floor) === 0);
        // winter/spring/summer/autumn sale crits: permanently cut every
        // unlocked floor's own upgrade/worker costs 25%, building-wide
        if (
          buyTier.winterSale ||
          buyTier.springSale ||
          buyTier.summerSale ||
          buyTier.autumnSale
        ) {
          applySeasonalSaleCrit(floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER);
        }
        // halloween sale crit: same reward, but its own steeper 50% cut
        if (buyTier.halloweenSale) {
          applySeasonalSaleCrit(floors, HALLOWEEN_SALE_DISCOUNT_MULTIPLIER);
        }
        // easter sale crit: same reward/steeper cut again, just its own icon
        if (buyTier.easterSale) {
          applySeasonalSaleCrit(floors, EASTER_SALE_DISCOUNT_MULTIPLIER);
        }
        // sunshine crit: same building-wide free-boost reward as boost, just
        // twice the duration
        if (buyTier.sunshine) applySunshineCrit(floors);
        // snowday crit: same reward again, three times the duration
        if (buyTier.snowday) applySnowdayCrit(floors);
        // fast forward crit: same instant-income reward as tick tock, just
        // a steeper multiplier
        if (buyTier.fastForward) applyFastForwardCrit(floors);
        // frozen crit: locks just this floor's own upgrade price for 15s
        if (buyTier.frozen) applyFrozenCrit(floor);
        // snowball crit: pays every unlocked floor once, scaled by how many
        // floors are currently unlocked
        if (buyTier.snowball) applySnowballCrit(floors);
        // free sale crit: starts just this floor's own free Sale event
        if (buyTier.freeSale) applyFreeSaleCrit(floor);
        // payday crit: same flat one-time triple-income effect a per-click
        // payday crit grants
        if (buyTier.payday) applyPaydayCrit();
        // gold standard crit: same flat one-time effect, a steeper 4x
        if (buyTier.goldStandard) applyGoldStandardCrit();
        // night shift crit: same building-wide free-boost reward as boost/
        // sunshine/snowday, just shorter and with a temporary +1-worker
        // boost-strength bonus (previously missed on this floor-buy branch,
        // only the plain-click branch applied it)
        if (buyTier.nightShift) applyNightShiftCrit(floors);
        // "special crit crit": once any proc above landed, a bonus tier may
        // have also landed on top of it (see rollCrit's own bonusTier)
        if (buyTier.bonusTier) applyBonusTierCrit(buyTier.bonusTier);
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
          buyTier.bounce,
          buyTier.explosion,
          buyTier.booty,
          buyTier.upgrade,
          buyTier.peppermint,
          buyTier.heavenly,
          buyTier.pair,
          buyTier.threeOfAKind,
          buyTier.fourOfAKind,
          buyTier.fullHouse,
          buyTier.tickTock,
          buyTier.chairGiveaway,
          buyTier.suppliesGiveaway,
          buyTier.winterSale,
          buyTier.springSale,
          buyTier.summerSale,
          buyTier.autumnSale,
          buyTier.halloweenSale,
          buyTier.sunshine,
          buyTier.snowday,
          buyTier.fastForward,
          buyTier.frozen,
          buyTier.snowball,
          buyTier.freeSale,
          buyTier.payday,
          buyTier.goldStandard,
          buyTier.royalFlush,
          buyTier.nightShift,
          buyTier.bonusTier,
          buyTier.intern,
          buyTier.unionBoss,
          buyTier.easterSale,
          buyTier.rushHour,
          buyTier.goldenTicket,
          buyTier.silverTicket,
          buyTier.goldenParachute,
          buyTier.payout,
          buyTier.grandOpening,
          buyTier.fullyStaffed,
          buyTier.espressoShot,
          buyTier.dejaVu,
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
      // 1 full bar's worth of the floor's own current payout, credited
      // straight to the player's total — never added back into
      // floor.incomeAmount itself, or each click would permanently raise the
      // rate the next click reads from
      const gained = multiply(
        currentPayoutAmount(floor, Date.now()),
        tier ? CRIT_TIER_CONFIG[tier].multiplier : 1,
      );
      addTotalIncome(gained);
      // re-arm the next crit for AFTER this sale ends without letting it also
      // roll a piggyback proc while a special event is already active (see
      // shared/critTypes' rollCrit's own allowSpecialProcs param)
      rollCritUpgrade(floor, false);
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
      // re-arm the next crit for AFTER this overtime run ends without
      // letting it also roll a piggyback proc while a special event is
      // already active (see shared/critTypes' rollCrit's own
      // allowSpecialProcs param)
      rollCritUpgrade(floor, false);
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
    // "Snowball" is no longer a timed click event (see shared/critTypes'
    // applySnowballCrit) — it's now a flat, instant reward applied straight
    // from the crit-consumption branches below, so there's no click branch
    // here anymore.
    // "Frozen" (see shared/critTypes' isFrozenCrit) is likewise no longer a
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
    if (isCritUpgrade(floor)) {
      const tier = getCritTier(floor)!;
      const chain = isChainCrit(floor);
      const boost = isBoostCrit(floor);
      const bounce = isBounceCrit(floor);
      const explosion = isExplosionCrit(floor);
      const booty = isBootyCrit(floor);
      const upgrade = isUpgradeCrit(floor);
      const peppermint = isPeppermintCrit(floor);
      const heavenly = isHeavenlyCrit(floor);
      const pair = isPairCrit(floor);
      const threeOfAKind = isThreeOfAKindCrit(floor);
      const fourOfAKind = isFourOfAKindCrit(floor);
      const fullHouse = isFullHouseCrit(floor);
      const royalFlush = isRoyalFlushCrit(floor);
      const tickTock = isTickTockCrit(floor);
      const chairGiveaway = isChairGiveawayCrit(floor);
      const suppliesGiveaway = isSuppliesGiveawayCrit(floor);
      const winterSale = isWinterSaleCrit(floor);
      const springSale = isSpringSaleCrit(floor);
      const summerSale = isSummerSaleCrit(floor);
      const autumnSale = isAutumnSaleCrit(floor);
      const halloweenSale = isHalloweenSaleCrit(floor);
      const easterSale = isEasterSaleCrit(floor);
      const sunshine = isSunshineCrit(floor);
      const snowday = isSnowdayCrit(floor);
      const fastForward = isFastForwardCrit(floor);
      const frozen = isFrozenCrit(floor);
      const snowball = isSnowballCrit(floor);
      const freeSale = isFreeSaleCrit(floor);
      const payday = isPaydayCrit(floor);
      const goldStandard = isGoldStandardCrit(floor);
      const nightShift = isNightShiftCrit(floor);
      const intern = isInternCrit(floor);
      const unionBoss = isUnionBossCrit(floor);
      const rushHour = isRushHourCrit(floor);
      const goldenTicket = isGoldenTicketCrit(floor);
      const silverTicket = isSilverTicketCrit(floor);
      const goldenParachute = isGoldenParachuteCrit(floor);
      const payout = isPayoutCrit(floor);
      const grandOpening = isGrandOpeningCrit(floor);
      const fullyStaffed = isFullyStaffedCrit(floor);
      const espressoShot = isEspressoShotCrit(floor);
      const dejaVu = isDejaVuCrit(floor);
      const bonusTier = getBonusTierCrit(floor);
      consumeCritUpgrade(floor);
      const count = CRIT_TIER_CONFIG[tier].multiplier;
      for (let i = 0; i < count; i++) {
        applyUpgradeTick(floor, isGroundFloor);
      }
      // reroll THIS floor's next crit exactly once for the whole landed crit —
      // never once per free tick above, or a big multiplier (x125 ultra) would
      // roll the special-crit gateway up to 125 times instead of once
      rollCritUpgrade(floor);
      if (chain) {
        const target = floors.indexOf(floor);
        applyChainCrit(deps, target, (chainFloor, chainIsGroundFloor) => {
          for (let i = 0; i < count; i++) {
            applyUpgradeTick(chainFloor, chainIsGroundFloor);
          }
          rollCritUpgrade(chainFloor);
        });
      }
      // bounce crit: cascades downward from the floor that actually crit,
      // like a ball bouncing down the stairs — never up — with its own
      // BOUNCE_CRIT_CONTINUE_CHANCE odds
      if (bounce) {
        const target = floors.indexOf(floor);
        applyBounceCrit(
          deps,
          target,
          (bounceFloor, bounceIsGroundFloor) => {
            for (let i = 0; i < count; i++) {
              applyUpgradeTick(bounceFloor, bounceIsGroundFloor);
            }
            rollCritUpgrade(bounceFloor);
          },
          BOUNCE_CRIT_CONTINUE_CHANCE,
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
            rollCritUpgrade(explosionFloor);
          },
        );
      }
      if (boost) applyFloorBoost(floors);
      // sunshine crit: same building-wide free-boost reward as boost, just
      // twice the duration
      if (sunshine) applySunshineCrit(floors);
      // snowday crit: same reward again, three times the duration
      if (snowday) applySnowdayCrit(floors);
      // booty crit: doubles the currently active company's total income once —
      // a flat effect, not tied to the tier/count that landed
      if (booty) addTotalIncome(getTotalIncome());
      // upgrade crit: promotes this floor's own permanent tier one further
      // step, same flat one-time effect as booty/boost
      if (upgrade)
        floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
      // peppermint crit: same flat one-time effect again, but promotes every
      // OTHER unlocked floor across the whole building at once
      if (peppermint) applyPeppermintCrit(floors);
      // heavenly crit: the biggest reward of all — unlocks every remaining
      // floor, maxes every floor's tier, and grants each one a full
      // max-tier free-upgrade batch
      if (heavenly) applyHeavenlyCrit(deps);
      // pair/three of a kind/four of a kind/full house crits: promote a
      // fixed number of floors' own permanent tier one step, starting at
      // the floor that actually crit (see POKER_HAND_CRIT_COUNTS)
      if (pair) {
        applyPokerHandCrit(
          deps,
          floors.indexOf(floor),
          POKER_HAND_CRIT_COUNTS.pair,
        );
      }
      if (threeOfAKind) {
        applyPokerHandCrit(
          deps,
          floors.indexOf(floor),
          POKER_HAND_CRIT_COUNTS.threeOfAKind,
        );
      }
      if (fourOfAKind) {
        applyPokerHandCrit(
          deps,
          floors.indexOf(floor),
          POKER_HAND_CRIT_COUNTS.fourOfAKind,
        );
      }
      if (fullHouse) {
        applyPokerHandCrit(
          deps,
          floors.indexOf(floor),
          POKER_HAND_CRIT_COUNTS.fullHouse,
        );
      }
      // royal flush crit: unlike the other poker-hand crits' fixed count,
      // this promotes EVERY floor from the one that actually crit all the
      // way up to the building's own cap (MAX_FLOORS_PER_BUILDING is always
      // a big enough count to reach it) — auto-unlocking as it goes
      if (royalFlush) {
        applyPokerHandCrit(
          deps,
          floors.indexOf(floor),
          MAX_FLOORS_PER_BUILDING,
        );
      }
      // tick tock crit: instantly pays every unlocked floor twice at its own
      // current rate, without disturbing any floor's own bar progress
      if (tickTock) applyTickTockCrit(floors);
      // fast forward crit: same instant-income reward as tick tock, just a
      // steeper multiplier
      if (fastForward) applyFastForwardCrit(floors);
      // frozen crit: locks just this floor's own upgrade price for 15s
      if (frozen) applyFrozenCrit(floor);
      // snowball crit: pays every unlocked floor once, scaled by how many
      // floors are currently unlocked
      if (snowball) applySnowballCrit(floors);
      // free sale crit: starts just this floor's own free Sale event
      if (freeSale) applyFreeSaleCrit(floor);
      // payday crit: triples the currently active company's total income
      // once, same flat one-time effect as booty
      if (payday) applyPaydayCrit();
      // gold standard crit: same flat one-time effect, a steeper 4x
      if (goldStandard) applyGoldStandardCrit();
      // night shift crit: same building-wide free-boost reward as boost/
      // sunshine/snowday, just shorter and with a temporary +1-worker
      // boost-strength bonus
      if (nightShift) applyNightShiftCrit(floors);
      // "special crit crit": once any proc above landed, a bonus tier may
      // have also landed on top of it (see rollCrit's own bonusTier)
      if (bonusTier) applyBonusTierCrit(bonusTier);
      // Chair Giveaway/Supplies Giveaway crits: free one-time office chairs/
      // supplies purchase for the floor that actually crit
      if (chairGiveaway) applyChairGiveawayCrit(floor);
      if (suppliesGiveaway) applySuppliesGiveawayCrit(floor);
      // Intern/Union Boss crits: free one-time worker/manager for the floor
      // that actually crit
      if (intern) applyInternCrit(floor);
      if (unionBoss) applyUnionBossCrit(floor);
      // rush hour crit: caps every unlocked floor's own income timer at
      // RUSH_HOUR_INTERVAL_SECONDS, building-wide, for its own duration
      if (rushHour) applyRushHourCrit(floors);
      // golden ticket crit: guarantees this floor's very next crit lands
      // ultra, no reward of its own
      if (goldenTicket) applyGoldenTicketCrit(floor);
      // silver ticket crit: guarantees this floor's very next crit lands
      // mega, no reward of its own
      if (silverTicket) applySilverTicketCrit(floor);
      // golden parachute crit: instantly pays 15s of the active company's
      // own combined income rate, no matter how much it's already banked
      if (goldenParachute) applyGoldenParachuteCrit();
      // payout crit: instantly adds every corporation's own combined income
      // + upgrades value, the biggest flat one-time jackpot
      if (payout) applyPayoutCrit();
      // grand opening crit: unlocks every remaining locked floor in this
      // building for free
      if (grandOpening) applyGrandOpeningCrit(deps);
      if (fullyStaffed) applyFullyStaffedCrit(floors);
      if (espressoShot) applyEspressoShotCrit(floors);
      if (dejaVu) applyDejaVuCrit(floor, isGroundFloor);
      // winter/spring/summer/autumn sale crits: permanently cut every
      // unlocked floor's own upgrade/worker costs 25%, building-wide
      if (winterSale || springSale || summerSale || autumnSale) {
        applySeasonalSaleCrit(floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER);
      }
      // halloween sale crit: same reward, but its own steeper 50% cut
      if (halloweenSale) {
        applySeasonalSaleCrit(floors, HALLOWEEN_SALE_DISCOUNT_MULTIPLIER);
      }
      // easter sale crit: same reward/steeper cut again, just its own icon
      if (easterSale) {
        applySeasonalSaleCrit(floors, EASTER_SALE_DISCOUNT_MULTIPLIER);
      }
      persist();
      triggerButtonPress(floor);
      triggerCritCelebration(
        floor,
        tier,
        getScreenCenterLocal,
        chain,
        boost,
        bounce,
        explosion,
        booty,
        upgrade,
        peppermint,
        heavenly,
        pair,
        threeOfAKind,
        fourOfAKind,
        fullHouse,
        tickTock,
        chairGiveaway,
        suppliesGiveaway,
        winterSale,
        springSale,
        summerSale,
        autumnSale,
        halloweenSale,
        sunshine,
        snowday,
        fastForward,
        frozen,
        snowball,
        freeSale,
        payday,
        goldStandard,
        royalFlush,
        nightShift,
        bonusTier,
        intern,
        unionBoss,
        easterSale,
        rushHour,
        goldenTicket,
        silverTicket,
        goldenParachute,
        payout,
        grandOpening,
        fullyStaffed,
        espressoShot,
        dejaVu,
      );
      return;
    }
    if (spendTotalIncome(floor.upgradeCost)) {
      applyUpgradeTick(floor, isGroundFloor);
      rollCritUpgrade(floor);
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
