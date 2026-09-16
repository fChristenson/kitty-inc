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
  triggerSpendingFreeze,
  triggerRushHourCrit,
  triggerRateLockCrit,
  armGuaranteedUltraCrit,
  armGuaranteedMegaCrit,
  LUCKY_CLOVER_CRIT_COUNT,
  LUCKY_CLOVER_CRIT_TIER,
  ROUND_UP_CRIT_STEP,
  SAFETY_NET_CRIT_UPGRADES,
  CASUAL_FRIDAY_CRIT_UPGRADES,
  FANCY_FRIDAY_CRIT_UPGRADES,
  DOUBLE_DOWN_CRIT_REPEATS,
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
  DOMINO_EFFECT_CONTINUE_CHANCE,
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
  getAllCompaniesIncomeRatePerSecond,
  getAllCompaniesTotalIncome,
  getAllCompaniesUpgradesValue,
  getActiveCompanyInvestedValue,
} from "../../totalIncome";
import { getActiveCompanyIndex } from "../../company";
import { spawnCoinBurst } from "../coins";
import { spawnFloatingCoins } from "../coinFloat";
import { spawnIncomeFloatText } from "../incomeFloatText";
import { getUpgradeIndicatorCenter } from "../star";
import { hitTestUpgradeArrow } from "../upgradeArrow";
import { computeBaseFloorStats } from "..";
import {
  type CritProcKind,
  type CritProcHandlers,
  readCritProcs,
  applyCritProcs,
  onlyCritProc,
  recordCritProcLanded,
} from "../../shared/critTypes";
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
import {
  type BigNumber,
  ZERO,
  add,
  gt,
  multiply,
} from "../../shared/bigNumber";
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

// "Executive Order" crit (see shared/critTypes's isExecutiveOrderCrit): the
// same tier promotion, but on EVERY unlocked floor instead of every other one
function applyExecutiveOrderCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
  }
}

// "Round Up" crit (see shared/critTypes's isRoundUpCrit): hands every
// unlocked floor however many free upgrades it takes to reach its NEXT whole
// multiple of ROUND_UP_CRIT_STEP — a floor already sitting exactly on one
// (a freshly unlocked floor is at 0) gets a full step rather than nothing
function applyRoundUpCrit(floors: Floor[]): void {
  for (const [index, floor] of floors.entries()) {
    if (!floor.unlocked) continue;
    const ticks =
      ROUND_UP_CRIT_STEP - (floor.upgradeCount % ROUND_UP_CRIT_STEP);
    for (let i = 0; i < ticks; i++) applyUpgradeTick(floor, index === 0);
  }
}

function applySafetyNetCrit(floors: Floor[]): void {
  let target: Floor | null = null;
  for (const floor of floors) {
    if (
      !floor.unlocked ||
      (target && !gt(floor.upgradeCost, target.upgradeCost))
    ) {
      continue;
    }
    target = floor;
  }
  if (!target) return;
  const targetIndex = floors.indexOf(target);
  for (let i = 0; i < SAFETY_NET_CRIT_UPGRADES; i++) {
    applyUpgradeTick(target, targetIndex === 0);
  }
}

function applyFloorShareCrit(
  floors: Floor[],
  target: Floor,
  isGroundFloor: boolean,
  levelMultiplier = 1,
): void {
  const targetIndex = floors.indexOf(target);
  if (targetIndex < 0 || !target.unlocked) return;

  let sharedLevel = target.upgradeCount;
  for (let index = 0; index < targetIndex; index++) {
    const floor = floors[index];
    if (floor.unlocked) sharedLevel += floor.upgradeCount;
  }

  const rateMultiplier = target.critMultiplierTier
    ? CRIT_TIER_CONFIG[target.critMultiplierTier].multiplier
    : 1;
  target.incomeAmount = add(
    target.incomeAmount,
    multiply(target.rateStep, sharedLevel * levelMultiplier * rateMultiplier),
  );
  const center = getButtonCenter(isGroundFloor);
  spawnCoinBurst(target, center.x, center.y, () => {});
}

// "Casual Friday"/"Fancy Friday" crits (see shared/critTypes's
// isCasualFridayCrit/isFancyFridayCrit): a flat batch of free upgrades on
// every unlocked floor, not scaled by the landed tier — the two differ only
// in how big the batch is
function applyFlatUpgradeBatch(floors: Floor[], count: number): void {
  for (const [index, floor] of floors.entries()) {
    if (!floor.unlocked) continue;
    for (let i = 0; i < count; i++) applyUpgradeTick(floor, index === 0);
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
  getCompanyValue: () => BigNumber;
  applyCompanyWideBoost: () => void;
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

// "Coffee Run" crit (see shared/critTypes' isCoffeeRunCrit): the same reward
// again, at the family's longest duration — a full minute
const COFFEE_RUN_BOOST_DURATION_MS = BOOST_DURATION_MS * 4;
function applyCoffeeRunCrit(floors: Floor[]): void {
  applyFloorBoost(floors, COFFEE_RUN_BOOST_DURATION_MS);
}

function applyDressCodeCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    if (!floor.hasManager) {
      floor.hasManager = true;
    } else {
      applyInternCrit(floor);
    }
  }
}

// "Recruitment Drive" crit: fill the floor that crit and then each contiguous
// unlocked floor above it, stopping before the first maxed or locked floor.
function applyRecruitmentDriveCrit(floors: Floor[], floor: Floor): void {
  let index = floors.indexOf(floor);
  if (index < 0 || !floor.unlocked) return;
  if (floor.workerCount < MAX_RENDERED_WORKERS) {
    floor.workerCount = MAX_RENDERED_WORKERS;
  }
  index += 1;
  while (index < floors.length) {
    const target = floors[index];
    if (!target.unlocked || target.workerCount >= MAX_RENDERED_WORKERS) return;
    target.workerCount = MAX_RENDERED_WORKERS;
    index += 1;
  }
}

// "Merger" crit: replay free upgrade ticks on every unlocked floor below the
// landing floor until each reaches the landing floor's level. Floor order is
// ground-to-top, so lower floors are the preceding array entries.
function applyMergerCrit(floors: Floor[], floor: Floor): void {
  const landingIndex = floors.indexOf(floor);
  const targetLevel = floor.upgradeCount;
  for (let index = landingIndex - 1; index >= 0; index--) {
    const lowerFloor = floors[index];
    if (!lowerFloor.unlocked) continue;
    while (lowerFloor.upgradeCount < targetLevel) {
      applyUpgradeTick(lowerFloor, index === 0);
    }
  }
}

// "night shift crit" (see shared/critTypes' isNightShiftCrit): same
// building-wide free-boost reward as boost/sunshine/snowday above, but its
// own SHORTER duration — half the normal boost length. Also, for the same
// shorter window, activates `extraWorkers` "virtual" boosted worker slots
// just past each unlocked floor's own last rendered worker index:
// countBoostedWorkers (gameState.ts) counts every slot regardless of
// rendered-worker cap, so this bumps incomePanel.ts's boost-speed exponent by
// extraWorkers/MAX_RENDERED_WORKERS — the same effect that many genuine extra
// boosted workers would have — while getRenderedWorkerCount-bounded drawing
// never renders them, since real workers only ever occupy indices below that
// count. "Night Owl" below is the same reward with two virtual workers
// instead of one
const NIGHT_SHIFT_BOOST_DURATION_MS = Math.round(BOOST_DURATION_MS / 2);
function applyNightShiftBoost(floors: Floor[], extraWorkers: number): void {
  applyFloorBoost(floors, NIGHT_SHIFT_BOOST_DURATION_MS);
  const now = Date.now();
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    const firstVirtualIndex = getRenderedWorkerCount(floor);
    for (let i = 0; i < extraWorkers; i++) {
      activateBoosted(
        floor,
        firstVirtualIndex + i,
        now,
        NIGHT_SHIFT_BOOST_DURATION_MS,
      );
    }
  }
}

function applyNightShiftCrit(floors: Floor[]): void {
  applyNightShiftBoost(floors, 1);
}

// "Night Owl" crit (see shared/critTypes' isNightOwlCrit): Night Shift with
// twice the virtual-worker bump
function applyNightOwlCrit(floors: Floor[]): void {
  applyNightShiftBoost(floors, 2);
}

// "Headhunter" crit (see shared/critTypes's isHeadhunterCrit): poaches the
// building's best headcount onto just the floor that crit — Reinforcements'
// levelling-up, narrowed to one floor. Nothing happens when that floor is
// already the best-staffed one (or the only one)
function applyHeadhunterCrit(floor: Floor, floors: Floor[]): void {
  let best = 0;
  for (const other of floors) {
    if (other.unlocked) best = Math.max(best, other.workerCount);
  }
  floor.workerCount = Math.max(
    floor.workerCount,
    Math.min(best, MAX_RENDERED_WORKERS),
  );
}

// "bull market crit" (see shared/critTypes's isBullMarketCrit): doubles every
// unlocked floor's own upgradeCount building-wide. Uses increaseIncomeRate
// directly rather than applyUpgradeTick for the same reason applyHeavenlyCrit
// does — a well-upgraded building would otherwise spawn thousands of bursts
function applyBullMarketCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    const existing = floor.upgradeCount;
    for (let i = 0; i < existing; i++) increaseIncomeRate(floor);
  }
}

// "Domino Effect" starts with one free upgrade on the landing floor, then
// has a 50% chance to reach each floor above it with double the prior batch.
// Batch upgrades use the cheap rate-only path so a late-building domino run
// cannot freeze the main thread by spawning one particle per simulated click.
function applyDominoEffectCrit(deps: ChainCritDeps, startIndex: number): void {
  const { floors, backgroundCount, multiplier, onFloorAdded } = deps;
  let index = startIndex;
  let count = 1;
  while (index < floors.length) {
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
    for (let i = 0; i < count; i++) increaseIncomeRate(target);
    if (index !== startIndex) rollCritUpgrade(target);
    index += 1;
    if (Math.random() >= DOMINO_EFFECT_CONTINUE_CHANCE) return;
    count *= 2;
  }
}

// Blueprint unlocks the next floor and copies the triggering floor's
// progression and staffing to it for free. The target starts at level 0, so
// replaying the source's upgrade count through the normal rate math preserves
// the target floor's own base economics while matching its upgrade level.
function applyBlueprintCrit(deps: ChainCritDeps, sourceIndex: number): void {
  const { floors, backgroundCount, multiplier, onFloorAdded } = deps;
  const source = floors[sourceIndex];
  const target = floors[sourceIndex + 1];
  if (!source || !target) return;
  if (!target.unlocked) {
    unlockFloor(target);
    ensureLockedFloorAbove({
      floors,
      backgroundCount,
      multiplier,
      onAdd: onFloorAdded,
    });
  }
  for (let i = 0; i < source.upgradeCount; i++) {
    increaseIncomeRate(target);
  }
  target.workerCount = source.workerCount;
  target.hasManager = source.hasManager;
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

// "Fire Drill" crit (see shared/critTypes's isFireDrillCrit): unlike tick
// tock above, this COMPLETES each unlocked floor's own income timer — one
// full payout, then the bar restarts from empty
function applyFireDrillCrit(floors: Floor[]): void {
  const now = Date.now();
  let total: BigNumber = ZERO;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    total = add(total, currentPayoutAmount(floor, now));
    floor.lastCollectedAt = now;
  }
  addTotalIncome(total);
}

// "Bonus Round" crit: completes only the floor that landed the crit twice,
// then restarts that floor's timer once so other floors and worker state stay
// untouched.
function applyBonusRoundCrit(floor: Floor): void {
  const now = Date.now();
  addTotalIncome(multiply(currentPayoutAmount(floor, now), 2));
  floor.lastCollectedAt = now;
}

// "Overflow" crit: completes only the floor that landed the crit five times,
// then restarts that floor's timer so other floors and worker state stay
// untouched.
function applyOverflowCrit(floor: Floor): void {
  const now = Date.now();
  addTotalIncome(multiply(currentPayoutAmount(floor, now), 5));
  floor.lastCollectedAt = now;
}

// "Performance Bonus" crit: completes one current income timer per actual
// worker and manager on every unlocked floor, then restarts each bar.
function applyPerformanceBonusCrit(floors: Floor[]): void {
  const now = Date.now();
  let total: BigNumber = ZERO;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    const staffingUnits = floor.workerCount + (floor.hasManager ? 1 : 0);
    total = add(
      total,
      multiply(currentPayoutAmount(floor, now), staffingUnits),
    );
    floor.lastCollectedAt = now;
  }
  addTotalIncome(total);
}

function applyShareholdersCrit(floors: Floor[]): void {
  let staffingUnits = 0;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    staffingUnits += floor.workerCount + (floor.hasManager ? 1 : 0);
  }
  const payoutPercent = Math.min(100, staffingUnits) / 100;
  addTotalIncome(multiply(getTotalIncome(), payoutPercent));
}

function applyTeaBreakCrit(floor: Floor, isGroundFloor: boolean): void {
  applyUpgradeTick(floor, isGroundFloor);
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

function applySpendingFreezeCrit(floors: Floor[]): void {
  triggerSpendingFreeze(floors);
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

// "Shift Change" fills only the landing floor and its immediately lower
// unlocked neighbor; floor arrays are stored ground-to-top.
function applyShiftChangeCrit(floors: Floor[], floor: Floor): void {
  const floorIndex = floors.indexOf(floor);
  const targets = [floor, floors[floorIndex - 1]];
  for (const target of targets) {
    if (target?.unlocked) target.workerCount = MAX_RENDERED_WORKERS;
  }
}

// "Reinforcements" copies the strongest unlocked floor workforce to every other
// unlocked floor without charging for workers — only ever levelling floors
// up, never taking workers away from one that's somehow already above the cap
function applyCloneArmyCrit(floors: Floor[]): void {
  const largestWorkerCount = floors.reduce(
    (largest, floor) =>
      floor.unlocked ? Math.max(largest, floor.workerCount) : largest,
    1,
  );
  const target = Math.min(largestWorkerCount, MAX_RENDERED_WORKERS);
  for (const floor of floors) {
    if (floor.unlocked) {
      floor.workerCount = Math.max(floor.workerCount, target);
    }
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

// "Double Down" crit (see shared/critTypes's isDoubleDownCrit): same shape as
// Deja Vu above, but replays the tier that ACTUALLY landed rather than a
// random one — so its value rides on whatever crit spawned it
function applyDoubleDownCrit(
  floor: Floor,
  isGroundFloor: boolean,
  tier: CritTier,
): void {
  const count = CRIT_TIER_CONFIG[tier].multiplier;
  for (
    let repetition = 0;
    repetition < DOUBLE_DOWN_CRIT_REPEATS;
    repetition++
  ) {
    for (let i = 0; i < count; i++) applyUpgradeTick(floor, isGroundFloor);
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

// "Supply Run" crit (see shared/critTypes's isSupplyRunCrit): both giveaways
// above at once, on the floor that actually crit
function applySupplyRunCrit(floor: Floor): void {
  applyChairGiveawayCrit(floor);
  applySuppliesGiveawayCrit(floor);
}

// "Intern"/"Union Boss" crits (see shared/critTypes's isInternCrit/
// isUnionBossCrit): grant the floor being upgraded one free worker/manager
// (same fields hud/upgradeMenu's own paid buyWorker/buyManager set), for
// free — Intern is capped at MAX_RENDERED_WORKERS (same cap buyWorker
// itself enforces), Union Boss is a no-op if the floor already has a manager
function applyInternCrit(floor: Floor): void {
  if (floor.workerCount < MAX_RENDERED_WORKERS) floor.workerCount += 1;
}

// "Talent Scout" crit: hire one capped real worker first, then boost every
// actual worker slot now present on the critted floor. No virtual slots or
// manager state are involved.
function applyTalentScoutCrit(floor: Floor): void {
  applyInternCrit(floor);
  const now = Date.now();
  for (let workerIndex = 0; workerIndex < floor.workerCount; workerIndex++) {
    activateBoosted(floor, workerIndex, now, BOOST_DURATION_MS);
  }
}

function applyUnionBossCrit(floor: Floor): void {
  floor.hasManager = true;
}

// "Golden Handshake" crit (see shared/critTypes's isGoldenHandshakeCrit):
// Union Boss applied to every unlocked floor at once
function applyGoldenHandshakeCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (floor.unlocked) applyUnionBossCrit(floor);
  }
}

// "Team Building" crit (see shared/critTypes's isTeamBuildingCrit): the same
// idea for Intern — one free worker on every unlocked floor at once
function applyTeamBuildingCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (floor.unlocked) applyInternCrit(floor);
  }
}

// "Team Lunch" crit: boost only the real worker slots on the floor that
// landed the crit, with exactly twice the normal boost duration. Managers and
// virtual worker slots are intentionally excluded.
const TEAM_LUNCH_BOOST_DURATION_MS = BOOST_DURATION_MS * 2;
function applyTeamLunchCrit(floor: Floor): void {
  const now = Date.now();
  for (let workerIndex = 0; workerIndex < floor.workerCount; workerIndex++) {
    activateBoosted(floor, workerIndex, now, TEAM_LUNCH_BOOST_DURATION_MS);
  }
}

// "Spring Cleaning" crit (see shared/critTypes's isSpringCleaningCrit): wipes
// each unlocked floor back to its own level-0 economy (rate/interval/cost, no
// banked upgrades) but one permanent tier higher — a fresh floor that earns
// more per upgrade from here on. A floor already at the top tier has nothing
// to trade its upgrades for, so it's skipped entirely. Workers/manager/office
// upgrades and the building's accumulated price discount all survive
function applySpringCleaningCrit(floors: Floor[], multiplier: number): void {
  for (const [index, floor] of floors.entries()) {
    if (!floor.unlocked) continue;
    const promoted = nextCritTier(floor.critMultiplierTier);
    if (promoted === floor.critMultiplierTier) continue;
    const base = computeBaseFloorStats(index + 1, multiplier);
    floor.incomeAmount = base.incomeAmount;
    floor.incomeIntervalSeconds = base.incomeIntervalSeconds;
    floor.rateStep = base.rateStep;
    floor.upgradeCost = multiply(
      base.upgradeCost,
      floor.priceDiscountMultiplier,
    );
    floor.upgradeCount = 0;
    floor.critMultiplierTier = promoted;
  }
}

// "Rush Hour" crit (see shared/critTypes's isRushHourCrit): no instant
// payout — just starts the building-wide timed window (see
// triggerRushHourCrit/isRushHourActive) during which every unlocked floor's
// own income timer is capped at RUSH_HOUR_INTERVAL_SECONDS (see
// incomePanel.ts's currentSpeedMultiplier)
function applyRushHourCrit(floors: Floor[]): void {
  triggerRushHourCrit(floors);
}

function applyRateLockCrit(floor: Floor): void {
  triggerRateLockCrit(floor);
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

// "Lucky Clover" crit (see shared/critTypes's isLuckyCloverCrit): instantly
// pays out LUCKY_CLOVER_CRIT_COUNT back-to-back ultra-tier crits on this
// floor, all at once
function applyLuckyCloverCrit(floor: Floor, isGroundFloor: boolean): void {
  const count = CRIT_TIER_CONFIG[LUCKY_CLOVER_CRIT_TIER].multiplier;
  for (let run = 0; run < LUCKY_CLOVER_CRIT_COUNT; run++) {
    for (let i = 0; i < count; i++) applyUpgradeTick(floor, isGroundFloor);
  }
}

// "Second Wind" crit (see shared/critTypes's isSecondWindCrit): hands back
// every dollar the active company has spent on upgrades, floor unlocks and
// building purchases — nothing bought is lost, the money just comes back
function applySecondWindCrit(): void {
  addTotalIncome(getActiveCompanyInvestedValue());
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

// Cash Flow pays one income cycle for every building in every corporation.
// The combined-rate helper uses live active buildings and persisted dormant
// company rates, so this never loads dormant floors.
function applyCashFlowCrit(): void {
  addTotalIncome(getAllCompaniesIncomeRatePerSecond());
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

// everything a proc's reward handler could need, so the one shared table
// below can serve every consumption site (a per-click crit, a floor-unlock
// crit, and Deja Vu's own spawned follow-ups) instead of each re-listing all
// 59 procs in its own if-chain
export interface CritRewardContext {
  deps: FloorActionsDeps;
  floors: Floor[];
  floor: Floor;
  isGroundFloor: boolean;
  tier: CritTier;
  // how many free upgrade ticks the landed tier is worth
  count: number;
  // this building's own economy scale (see buildings/getBuildingMultiplier)
  multiplier: number;
}

// the reward every proc grants regardless of WHICH event consumed it. The
// three "walk the reward across floors" procs (chain/bounce/explosion) are
// the only ones that genuinely differ per event, so they're layered on top
// per-site below rather than living here
const SHARED_CRIT_REWARDS: CritProcHandlers<CritRewardContext> = {
  powerSurge: (c) => c.deps.applyCompanyWideBoost(),
  executiveBonus: (c) =>
    addTotalIncome(multiply(c.deps.getCompanyValue(), 0.25)),
  boost: (c) => applyFloorBoost(c.floors),
  booty: () => addTotalIncome(getTotalIncome()),
  bullMarket: (c) => applyBullMarketCrit(c.floors),
  upgrade: (c) => {
    c.floor.critMultiplierTier = nextCritTier(c.floor.critMultiplierTier);
  },
  peppermint: (c) => applyPeppermintCrit(c.floors),
  heavenly: (c) => applyHeavenlyCrit(c.deps),
  pair: (c) =>
    applyPokerHandCrit(
      c.deps,
      c.floors.indexOf(c.floor),
      POKER_HAND_CRIT_COUNTS.pair,
    ),
  threeOfAKind: (c) =>
    applyPokerHandCrit(
      c.deps,
      c.floors.indexOf(c.floor),
      POKER_HAND_CRIT_COUNTS.threeOfAKind,
    ),
  fourOfAKind: (c) =>
    applyPokerHandCrit(
      c.deps,
      c.floors.indexOf(c.floor),
      POKER_HAND_CRIT_COUNTS.fourOfAKind,
    ),
  fullHouse: (c) =>
    applyPokerHandCrit(
      c.deps,
      c.floors.indexOf(c.floor),
      POKER_HAND_CRIT_COUNTS.fullHouse,
    ),
  // unlike the fixed-count hands above, this one climbs all the way to the
  // building's own cap, auto-unlocking as it goes
  royalFlush: (c) =>
    applyPokerHandCrit(
      c.deps,
      c.floors.indexOf(c.floor),
      MAX_FLOORS_PER_BUILDING,
    ),
  tickTock: (c) => applyTickTockCrit(c.floors),
  chairGiveaway: (c) => applyChairGiveawayCrit(c.floor),
  suppliesGiveaway: (c) => applySuppliesGiveawayCrit(c.floor),
  winterSale: (c) =>
    applySeasonalSaleCrit(c.floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER),
  springSale: (c) =>
    applySeasonalSaleCrit(c.floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER),
  summerSale: (c) =>
    applySeasonalSaleCrit(c.floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER),
  autumnSale: (c) =>
    applySeasonalSaleCrit(c.floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER),
  halloweenSale: (c) =>
    applySeasonalSaleCrit(c.floors, HALLOWEEN_SALE_DISCOUNT_MULTIPLIER),
  easterSale: (c) =>
    applySeasonalSaleCrit(c.floors, EASTER_SALE_DISCOUNT_MULTIPLIER),
  sunshine: (c) => applySunshineCrit(c.floors),
  snowday: (c) => applySnowdayCrit(c.floors),
  fastForward: (c) => applyFastForwardCrit(c.floors),
  frozen: (c) => applyFrozenCrit(c.floor),
  spendingFreeze: (c) => applySpendingFreezeCrit(c.floors),
  snowball: (c) => applySnowballCrit(c.floors),
  freeSale: (c) => applyFreeSaleCrit(c.floor),
  payday: () => applyPaydayCrit(),
  goldStandard: () => applyGoldStandardCrit(),
  nightShift: (c) => applyNightShiftCrit(c.floors),
  intern: (c) => applyInternCrit(c.floor),
  talentScout: (c) => applyTalentScoutCrit(c.floor),
  unionBoss: (c) => applyUnionBossCrit(c.floor),
  rushHour: (c) => applyRushHourCrit(c.floors),
  rateLock: (c) => applyRateLockCrit(c.floor),
  goldenTicket: (c) => applyGoldenTicketCrit(c.floor),
  silverTicket: (c) => applySilverTicketCrit(c.floor),
  goldenParachute: () => applyGoldenParachuteCrit(),
  cashFlow: () => applyCashFlowCrit(),
  payout: () => applyPayoutCrit(),
  grandOpening: (c) => applyGrandOpeningCrit(c.deps),
  fullyStaffed: (c) => applyFullyStaffedCrit(c.floors),
  shiftChange: (c) => applyShiftChangeCrit(c.floors, c.floor),
  espressoShot: (c) => applyEspressoShotCrit(c.floors),
  dejaVu: (c) => applyDejaVuCrit(c.floor, c.isGroundFloor),
  cloneArmy: (c) => applyCloneArmyCrit(c.floors),
  luckyClover: (c) => applyLuckyCloverCrit(c.floor, c.isGroundFloor),
  secondWind: () => applySecondWindCrit(),
  executiveOrder: (c) => applyExecutiveOrderCrit(c.floors),
  roundUp: (c) => applyRoundUpCrit(c.floors),
  safetyNet: (c) => applySafetyNetCrit(c.floors),
  floorShare: (c) => applyFloorShareCrit(c.floors, c.floor, c.isGroundFloor),
  sameBoat: (c) => applyFloorShareCrit(c.floors, c.floor, c.isGroundFloor, 2),
  goldenHandshake: (c) => applyGoldenHandshakeCrit(c.floors),
  supplyRun: (c) => applySupplyRunCrit(c.floor),
  casualFriday: (c) =>
    applyFlatUpgradeBatch(c.floors, CASUAL_FRIDAY_CRIT_UPGRADES),
  fancyFriday: (c) =>
    applyFlatUpgradeBatch(c.floors, FANCY_FRIDAY_CRIT_UPGRADES),
  fireDrill: (c) => applyFireDrillCrit(c.floors),
  bonusRound: (c) => applyBonusRoundCrit(c.floor),
  overflow: (c) => applyOverflowCrit(c.floor),
  performanceBonus: (c) => applyPerformanceBonusCrit(c.floors),
  teaBreak: (c) => applyTeaBreakCrit(c.floor, c.isGroundFloor),
  doubleDown: (c) => applyDoubleDownCrit(c.floor, c.isGroundFloor, c.tier),
  coffeeRun: (c) => applyCoffeeRunCrit(c.floors),
  dressCode: (c) => applyDressCodeCrit(c.floors),
  recruitmentDrive: (c) => applyRecruitmentDriveCrit(c.floors, c.floor),
  merger: (c) => applyMergerCrit(c.floors, c.floor),
  shareholders: (c) => applyShareholdersCrit(c.floors),
  teamBuilding: (c) => applyTeamBuildingCrit(c.floors),
  teamLunch: (c) => applyTeamLunchCrit(c.floor),
  springCleaning: (c) => applySpringCleaningCrit(c.floors, c.multiplier),
  nightOwl: (c) => applyNightOwlCrit(c.floors),
  headhunter: (c) => applyHeadhunterCrit(c.floor, c.floors),
  blueprint: (c) => applyBlueprintCrit(c.deps, c.floors.indexOf(c.floor)),
};

// an upgrade-click crit walks its landed tier's own free-upgrade batch across
// the floors it reaches, re-arming each one's next crit as it goes
const CLICK_CRIT_REWARDS: CritProcHandlers<CritRewardContext> = {
  ...SHARED_CRIT_REWARDS,
  dominoEffect: (c) => applyDominoEffectCrit(c.deps, c.floors.indexOf(c.floor)),
  chain: (c) =>
    applyChainCrit(c.deps, c.floors.indexOf(c.floor), (reached, isGround) => {
      for (let i = 0; i < c.count; i++) applyUpgradeTick(reached, isGround);
      rollCritUpgrade(reached);
    }),
  bounce: (c) =>
    applyBounceCrit(
      c.deps,
      c.floors.indexOf(c.floor),
      (reached, isGround) => {
        for (let i = 0; i < c.count; i++) applyUpgradeTick(reached, isGround);
        rollCritUpgrade(reached);
      },
      BOUNCE_CRIT_CONTINUE_CHANCE,
    ),
  explosion: (c) =>
    applyExplosionCrit(
      c.deps,
      c.floors.indexOf(c.floor),
      (reached, isGround) => {
        for (let i = 0; i < c.count; i++) applyUpgradeTick(reached, isGround);
        rollCritUpgrade(reached);
      },
    ),
};

// a floor-unlock crit has no free-upgrade batch to spread, so its walkers
// promote each reached floor's permanent tier instead
const FLOOR_BUY_CRIT_REWARDS: CritProcHandlers<CritRewardContext> = {
  ...SHARED_CRIT_REWARDS,
  dominoEffect: (c) => applyDominoEffectCrit(c.deps, c.floors.indexOf(c.floor)),
  // A newly unlocked floor always starts at level 0, so Merger has no useful
  // target level to synchronize into floors below it on this path.
  merger: () => {},
  chain: (c) =>
    applyChainCrit(c.deps, c.floors.indexOf(c.floor), (reached) => {
      reached.critMultiplierTier = pickHigherCritTier(
        reached.critMultiplierTier,
        c.tier,
      );
    }),
  bounce: (c) =>
    applyBounceCrit(
      c.deps,
      c.floors.indexOf(c.floor),
      (reached) => {
        reached.critMultiplierTier = pickHigherCritTier(
          reached.critMultiplierTier,
          c.tier,
        );
      },
      BOUNCE_CRIT_CONTINUE_CHANCE,
    ),
  explosion: (c) =>
    applyExplosionCrit(c.deps, c.floors.indexOf(c.floor), (reached) => {
      reached.critMultiplierTier = pickHigherCritTier(
        reached.critMultiplierTier,
        c.tier,
      );
    }),
};

// Deja Vu's spawned follow-ups go through the exact same reward dispatcher
// and collectible tally a genuinely rolled proc does — they used to be
// celebration-only, so a follow-up Heavenly flashed without ever unlocking a
// single floor or counting toward its badge
function grantFollowUpProc(
  kind: CritProcKind,
  context: CritRewardContext,
): void {
  applyCritProcs(onlyCritProc(kind), context, CLICK_CRIT_REWARDS);
  recordCritProcLanded(kind);
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
      const buyRewardContext: CritRewardContext | null = buyTier
        ? {
            deps,
            floors,
            floor,
            isGroundFloor: floors.indexOf(floor) === 0,
            tier: buyTier.tier,
            count: CRIT_TIER_CONFIG[buyTier.tier].multiplier,
            multiplier,
          }
        : null;
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
        applyCritProcs(buyTier, buyRewardContext!, FLOOR_BUY_CRIT_REWARDS);
        // "special crit crit": once any proc above landed, a bonus tier may
        // have also landed on top of it (see rollCrit's own bonusTier)
        if (buyTier.bonusTier) applyBonusTierCrit(buyTier.bonusTier);
      }
      const center = getLockCenter();
      spawnCoinBurst(floor, center.x, center.y, () => {});
      if (buyTier)
        triggerCritCelebration(
          floor,
          buyTier.tier,
          getScreenCenterLocal,
          buyTier,
          buyTier.bonusTier,
          (kind) => grantFollowUpProc(kind, buyRewardContext!),
        );
      // after the celebration, not before: Deja Vu grants its follow-up procs'
      // rewards synchronously from in there, and they'd otherwise miss this save
      persist();
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
      const procs = readCritProcs(floor);
      const bonusTier = getBonusTierCrit(floor);
      consumeCritUpgrade(floor);
      const count = CRIT_TIER_CONFIG[tier].multiplier;
      for (let i = 0; i < count; i++) {
        applyUpgradeTick(floor, isGroundFloor);
      }
      // reroll THIS floor's next crit exactly once for the whole landed crit —
      // never once per free tick below, or a big multiplier (x125 ultra) would
      // roll the special-crit gateway up to 125 times instead of once
      rollCritUpgrade(floor);
      const rewardContext: CritRewardContext = {
        deps,
        floors,
        floor,
        isGroundFloor,
        tier,
        count,
        multiplier,
      };
      applyCritProcs(procs, rewardContext, CLICK_CRIT_REWARDS);
      // "special crit crit": once any proc above landed, a bonus tier may
      // have also landed on top of it (see rollCrit's own bonusTier)
      if (bonusTier) applyBonusTierCrit(bonusTier);
      triggerButtonPress(floor);
      triggerCritCelebration(
        floor,
        tier,
        getScreenCenterLocal,
        procs,
        bonusTier,
        (kind) => grantFollowUpProc(kind, rewardContext),
      );
      // after the celebration, not before: Deja Vu grants its follow-up procs'
      // rewards synchronously from in there, and they'd otherwise miss this save
      persist();
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
