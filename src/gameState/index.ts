import { companyStorageKey } from "../company";
import {
  type BigNumber,
  type SerializedBigNumber,
  ZERO,
  toBigNumber,
  add,
  multiply,
  subtract,
  gte,
} from "../shared/bigNumber";
import type { CritTier } from "../shared/critTypes";
import { createSaveScheduler } from "../shared/persistence";

// bumped from "cash-clicker:floors" now that this holds Floor[][] (one entry per
// building) instead of a single Floor[] — old single-building saves just start fresh
const STORAGE_KEY = "cash-clicker:buildings";

// a random per-page-load token, written to localStorage once at startup (see
// initSessionGuard, called from main.ts) purely so every beforeunload-driven save
// (this module's saveBuildings, totalIncome.ts's own total save) can tell whether
// storage was wiped out from under them since load — e.g. a player using DevTools'
// "Clear site data" to manually reset progress, then closing the tab. Without this,
// that close would just silently re-save the still-in-memory (pre-clear) state
// right back into localStorage, undoing the reset the player just performed.
const SESSION_KEY = "cash-clicker:session";
let sessionToken = "";

export function initSessionGuard(): void {
  sessionToken = String(Math.random());
  try {
    localStorage.setItem(SESSION_KEY, sessionToken);
  } catch {
    // storage unavailable: nothing to guard, but nothing to lose either
  }
}

// false once whatever wrote the current sessionToken (this same page load) finds it
// missing/changed in storage — a sign something external cleared it out; every
// beforeunload persist handler should skip saving when this returns false
export function isStorageIntact(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === sessionToken;
  } catch {
    return true; // storage unavailable entirely isn't the "someone cleared it" case
  }
}

export interface WorkerSlot {
  boosted: boolean; // whether coinFloat.ts's floating-coin animation is active on this worker
  boostedAt: number; // Date.now() when boosted turned on; auto-resets durationMs later
  // how long THIS activation lasts — defaults to BOOST_DURATION_MS when unset
  // (every slot created before this field existed, or a fresh never-boosted
  // slot) so a longer-lasting boost (see shared/critTypes' Sunshine crit) can
  // override it per-activation without a separate parallel mechanism
  durationMs?: number;
}

export const BOOST_DURATION_MS = 15_000; // boosted state auto-resets this long after being triggered
// floors/coinFloat.ts blinks a boosted worker's floating coins once this little
// time is left, so letting a boost run out down to the wire visibly reads as
// "about to lose this" instead of it just quietly expiring
export const BOOST_URGENT_THRESHOLD_MS = 5_000;

export interface Floor {
  bgIndex: number; // which loaded shop background this floor draws (floors/index.ts)
  incomeAmount: BigNumber;
  incomeIntervalSeconds: number;
  upgradeCost: BigNumber; // $ needed to buy this floor's next upgrade; doubles per purchase
  rateStep: BigNumber; // $ added to incomeAmount per upgrade click
  upgradeCount: number; // how many upgrades have been bought on this floor
  unlocked: boolean;
  unlockCost: BigNumber; // 0 for floor 1 (always free); doubles starting from floor 2
  workerCount: number; // how many workers this floor has bought via workerMenu.ts; scales its boost strength
  lastCollectedAt: number; // Date.now() ms this floor last completed a whole idle-income cycle
  hasOfficeChairs: boolean; // one-time per-floor purchase (hud/upgradeMenu); never resets once true
  hasOfficeSupplies: boolean; // one-time per-floor purchase (hud/upgradeMenu); never resets once true
  hasManager: boolean; // one-time per-floor purchase (hud/upgradeMenu); never resets once true
  // permanent per-floor rate multiplier, rolled once when the floor is bought/
  // unlocked (see floorInteractions.ts's rollFloorBuyCrit) — never re-rolled or
  // cleared afterward. Real CritTier type from shared/critTypes (a type-only
  // import, erased at build time, so importing it here creates no runtime
  // cycle even though shared/critTypes itself type-imports Floor from here)
  critMultiplierTier: CritTier | null;
  // set once at creation (floors/index.ts's buildFloor) when this floor's
  // natural, uncapped incomeIntervalSeconds already exceeds incomePanel.ts's
  // MAX_INCOME_INTERVAL_SECONDS (1h) cap — never recomputed afterward, even as
  // upgrades keep halving its actual interval well below 1h. Lets
  // increaseIncomeRate charge a steeper per-upgrade cost growth on these
  // floors, since every upgrade here is worth more (it wasn't "supposed" to
  // earn this fast) than the same upgrade on a floor that was never capped
  aboveCapTier: boolean;
  // "Work overtime" boost's own persisted gauge state (see floors/upgradeButton) —
  // stored directly on the floor (not a WeakMap) so it survives a reload and
  // follows the floor across building switches; the drain tail is derived purely
  // from (overtimeTicks, overtimeStartedAt, now) so it correctly keeps draining
  // across however long the app was actually closed, same as idle income above
  overtimeTicks: number;
  overtimeStartedAt: number | null; // Date.now() ms the CURRENT run's window started; null = no run yet
  overtimeCost: BigNumber; // $ paid for the CURRENT run; ZERO if never triggered
  // permanent per-floor price multiplier (default 1), permanently multiplied
  // by 0.75 each time a "seasonal sale" crit lands on this floor (see
  // shared/critTypes' SEASONAL_SALE_DISCOUNT_MULTIPLIER) — folded into
  // hud/upgradeMenu's getFloorPrice, so it discounts every worker/office
  // chairs/supplies/manager cost derived from it. floor.upgradeCost itself is
  // discounted directly (a stored, already-mutable value), this multiplier is
  // only needed for the derived-from-getFloorPrice costs
  priceDiscountMultiplier: number;
}

// gameState.ts is the sole owner of this per-floor data (Floor itself doesn't carry it),
// keyed by the floor itself the same way worker.ts tracks its own ephemeral walk state
const workerSlots = new WeakMap<Floor, WorkerSlot[]>();

function getWorkerSlots(floor: Floor): WorkerSlot[] {
  let slots = workerSlots.get(floor);
  if (!slots) {
    slots = [];
    workerSlots.set(floor, slots);
  }
  return slots;
}

// lazily grows a floor's slot list so each worker index gets its own independent
// boosted flag, instead of every worker on a floor sharing a single slot
function ensureSlot(floor: Floor, workerIndex: number): WorkerSlot {
  const slots = getWorkerSlots(floor);
  while (slots.length <= workerIndex) {
    slots.push({ boosted: false, boostedAt: -Infinity });
  }
  return slots[workerIndex];
}

function expireIfStale(slot: WorkerSlot, now: number): boolean {
  if (
    slot.boosted &&
    now - slot.boostedAt >= (slot.durationMs ?? BOOST_DURATION_MS)
  ) {
    slot.boosted = false;
  }
  return slot.boosted;
}

export function isBoosted(
  floor: Floor,
  workerIndex: number,
  now: number,
): boolean {
  return expireIfStale(ensureSlot(floor, workerIndex), now);
}

// durationMs (default BOOST_DURATION_MS) lets a caller grant a longer-lasting
// boost than the normal one (see shared/critTypes' Sunshine crit) without
// touching any other activation's own duration
export function activateBoosted(
  floor: Floor,
  workerIndex: number,
  now: number,
  durationMs: number = BOOST_DURATION_MS,
): void {
  const slot = ensureSlot(floor, workerIndex);
  slot.boosted = true;
  slot.boostedAt = now;
  slot.durationMs = durationMs;
}

// how many of a floor's workers are currently boosted; incomePanel.ts uses this to
// scale the income rate delay down per boosted worker
export function countBoostedWorkers(floor: Floor, now: number): number {
  return getWorkerSlots(floor).filter((slot) => expireIfStale(slot, now))
    .length;
}

// ms left on a worker's boost, 0 once expired/never boosted; worker.ts's
// getBoostedWorkerCenters uses this to flag which centers should blink as urgent
export function getBoostRemainingMs(
  floor: Floor,
  workerIndex: number,
  now: number,
): number {
  const slot = ensureSlot(floor, workerIndex);
  if (!expireIfStale(slot, now)) return 0;
  return Math.max(
    0,
    (slot.durationMs ?? BOOST_DURATION_MS) - (now - slot.boostedAt),
  );
}

// the latest moment (ms) any of this floor's own worker-boost slots is still
// scheduled to run until, or -Infinity if none are currently boosted — a pure
// read of the raw (boostedAt, durationMs) pair, NOT `slot.boosted` itself
// (which only gets lazily cleared the next time expireIfStale actually runs
// against it, so it can't be trusted as "still boosted" on its own after a
// long away/idle gap). Used only by the away/idle income catch-up below,
// which needs to know WHEN a boost that was active while unobserved actually
// ran out, not just whether it's active right now
export function getFloorBoostEndsAt(floor: Floor): number {
  let latest = -Infinity;
  for (const slot of getWorkerSlots(floor)) {
    if (!slot.boosted) continue;
    latest = Math.max(
      latest,
      slot.boostedAt + (slot.durationMs ?? BOOST_DURATION_MS),
    );
  }
  return latest;
}

// which theme color (floors/worker/index.ts's THEME_COLORS) each of a floor's
// workers is tinted with, keyed by the floor the same way workerSlots is —
// persisted (see SavedFloor.tintIndexes below) so a worker's color survives a
// reload instead of being re-randomized every time
const workerTintIndexes = new WeakMap<Floor, number[]>();

export function getWorkerTintIndexes(floor: Floor): number[] {
  let indexes = workerTintIndexes.get(floor);
  if (!indexes) {
    indexes = [];
    workerTintIndexes.set(floor, indexes);
  }
  return indexes;
}

const LAST_CLOSE_KEY = "cash-clicker:last-close";
const IDLE_INCOME_MIN_SECONDS = 3; // shorter gaps (a normal page reload) don't count as idle time

// call this from a `beforeunload` listener (see main.ts) — the ONLY writer of this
// timestamp, so it purely marks "when did the tab actually go away", independent of
// whether any in-session ticker happened to run recently before that moment
export function markAppClosed(): void {
  try {
    localStorage.setItem(LAST_CLOSE_KEY, String(Date.now()));
  } catch {
    // storage unavailable: idle income just won't be tracked next time
  }
}

// $ every unlocked floor across every building earned, at its own current rate, over
// the plain wall-clock gap between the last markAppClosed() timestamp and now — a
// straight rate * elapsedSeconds calculation, not dependent on floor.lastCollectedAt
// having been kept continuously fresh by some in-session ticker (that ticker can be
// throttled/paused for all sorts of reasons while the tab sits open; the close
// timestamp + current rate is the only pair of numbers actually needed here). Must
// only be called once per page load. Below the quick-refresh gate, every floor's
// lastCollectedAt is left completely untouched — incomePanel.ts's fill-bar progress
// is computed straight from lastCollectedAt, so touching it on a quick refresh would
// silently discard however far into its current cycle a floor already was.
//
// getIncomeRatePerSecond is injected (rather than imported from floors/incomePanel)
// so this file doesn't need a real, cycle-risking import from floors/ — main.ts
// passes in the floors facade's own boost-aware currentIncomeRatePerSecond(floor,
// now), which is exactly what makes the worker-boost segment below correct: a
// boost that was still ticking down when the app closed now earns its own
// elevated rate for exactly however much of the idle span it genuinely had left
// (see getFloorBoostEndsAt), falling back to the normal rate for the remainder,
// instead of the whole idle span being priced at whichever rate happens to apply
// once this finally runs (previously always the un-boosted rate, since boost
// state used to be treated as if it never survived a reload).
export function computeIdleIncome(
  buildings: Floor[][],
  getIncomeRatePerSecond: (floor: Floor, now: number) => BigNumber,
  incomeBoostMultiplier = 1,
): BigNumber {
  let lastClose: number | null = null;
  try {
    const raw = localStorage.getItem(LAST_CLOSE_KEY);
    lastClose = raw ? Number(raw) : null;
  } catch {
    lastClose = null;
  }

  const now = Date.now();
  const elapsedSeconds =
    lastClose !== null && Number.isFinite(lastClose)
      ? Math.max(0, (now - lastClose) / 1000)
      : 0;
  if (elapsedSeconds <= IDLE_INCOME_MIN_SECONDS || lastClose === null)
    return ZERO;

  let idleIncome: BigNumber = ZERO;
  for (const floors of buildings) {
    for (const floor of floors) {
      if (!floor.unlocked) continue;
      idleIncome = add(
        idleIncome,
        multiply(
          integrateAwayIncome(floor, lastClose, now, getIncomeRatePerSecond),
          incomeBoostMultiplier,
        ),
      );
      // this whole idle span was just paid out in one lump sum, so the floor's next
      // cycle correctly starts fresh from right now
      floor.lastCollectedAt = now;
    }
  }
  return idleIncome;
}

// a floor's own $ earned across [fromMs, toMs), split into (at most) two
// segments right at its own worker-boost expiry (getFloorBoostEndsAt) if that
// falls strictly inside the window — the boosted segment prices at the rate
// AT fromMs (still boosted, by construction: nothing can arm/clear a boost on
// a floor while it isn't the active company's, so whatever was true right as
// it went idle/dormant holds for its own whole remaining duration), the rest
// at the rate AT toMs. Collapses to a single flat-rate segment (identical to
// the old plain rate*elapsedSeconds formula) whenever no boost decayed mid-span
function integrateAwayIncome(
  floor: Floor,
  fromMs: number,
  toMs: number,
  getIncomeRatePerSecond: (floor: Floor, now: number) => BigNumber,
): BigNumber {
  if (toMs <= fromMs) return ZERO;
  const boostEndsAt = getFloorBoostEndsAt(floor);
  if (boostEndsAt > fromMs && boostEndsAt < toMs) {
    const boostedSeconds = (boostEndsAt - fromMs) / 1000;
    const normalSeconds = (toMs - boostEndsAt) / 1000;
    return add(
      multiply(getIncomeRatePerSecond(floor, fromMs), boostedSeconds),
      multiply(getIncomeRatePerSecond(floor, toMs), normalSeconds),
    );
  }
  return multiply(getIncomeRatePerSecond(floor, toMs), (toMs - fromMs) / 1000);
}

// tops up whatever the NORMAL per-floor cycle catch-up (collectDueIncome, run by
// the ticker the instant it resumes ticking these floors again) is about to pay
// for a floor whose own worker boost decayed at some point WHILE its building/
// company sat dormant (switched away from, not a full app close — see
// main.ts's switchToCompany) — collectDueIncome only ever prices an elapsed gap
// at ONE rate (whatever applies the moment it's finally called), so a boost
// that had, say, 10s left when the player switched away and a 60s gap before
// they switched back would otherwise be paid entirely at the post-expiry rate,
// silently losing the extra the boosted portion should have earned. Left
// completely alone (zero credit, zero side effects) for every floor whose own
// boost was already over before it went dormant, still running past `now`, or
// never armed at all — those are already priced exactly right by the normal
// catch-up on its own, nothing to correct. Deliberately does NOT touch
// floor.lastCollectedAt — that stays owned by collectDueIncome, so this is a
// pure top-up layered on top of its own normal catch-up, never a replacement
// for it
export function reconcileBoostedAwayIncome(
  buildings: Floor[][],
  getIncomeRatePerSecond: (floor: Floor, now: number) => BigNumber,
  now = Date.now(),
): BigNumber {
  let extra: BigNumber = ZERO;
  for (const floors of buildings) {
    for (const floor of floors) {
      if (!floor.unlocked) continue;
      const boostEndsAt = getFloorBoostEndsAt(floor);
      if (boostEndsAt <= floor.lastCollectedAt || boostEndsAt >= now) continue;
      const boostedSeconds = (boostEndsAt - floor.lastCollectedAt) / 1000;
      const normalSeconds = (now - boostEndsAt) / 1000;
      const trueOwed = add(
        multiply(
          getIncomeRatePerSecond(floor, floor.lastCollectedAt),
          boostedSeconds,
        ),
        multiply(getIncomeRatePerSecond(floor, now), normalSeconds),
      );
      // what collectDueIncome will price this exact same span at once it
      // resumes: a single (post-expiry, un-boosted) rate for the whole gap
      const baseline = multiply(
        getIncomeRatePerSecond(floor, now),
        boostedSeconds + normalSeconds,
      );
      if (gte(trueOwed, baseline)) {
        extra = add(extra, subtract(trueOwed, baseline));
      }
    }
  }
  return extra;
}

// a $ field as it may appear in a saved floor: the new {mantissa, exponent}
// BigNumber shape, or a plain number (every save written before this
// migration) — see shared/bigNumber's toBigNumber, which normalizes either
interface SavedFloor {
  incomeAmount: SerializedBigNumber;
  incomeIntervalSeconds: number;
  upgradeCost: SerializedBigNumber;
  rateStep: SerializedBigNumber;
  upgradeCount: number;
  workers: WorkerSlot[];
  unlocked: boolean;
  unlockCost: SerializedBigNumber;
  workerCount?: number; // added after initial release; older saves default to 1 on load
  lastCollectedAt?: number; // added after initial release; older saves default to now() on load
  bgIndex?: number; // added after initial release; older saves default to 0 on load
  spriteIndexes?: number[]; // renamed to tintIndexes; kept only so very old saves parse
  tintIndexes?: number[]; // added after initial release; older saves default to [] on load
  hasOfficeChairs?: boolean; // added after initial release; older saves default to false on load
  hasOfficeSupplies?: boolean; // added after initial release; older saves default to false on load
  hasManager?: boolean; // added after initial release; older saves default to false on load
  critMultiplierTier?: CritTier | null; // added after initial release; older saves default to null on load
  aboveCapTier?: boolean; // added after initial release; older saves default to false on load
  overtimeTicks?: number; // added after initial release; older saves default to 0 on load
  overtimeStartedAt?: number | null; // added after initial release; older saves default to null on load
  overtimeCost?: SerializedBigNumber; // added after initial release; older saves default to ZERO on load
  priceDiscountMultiplier?: number; // added after initial release; older saves default to 1 on load
}

interface SavedBuildings {
  buildings: SavedFloor[][];
}

export function clearBuildings(companyIndex = 0): void {
  try {
    localStorage.removeItem(companyStorageKey(STORAGE_KEY, companyIndex));
  } catch {
    // storage unavailable: nothing to clear
  }
}

function toSavedFloor(floor: Floor): SavedFloor {
  return {
    incomeAmount: floor.incomeAmount,
    incomeIntervalSeconds: floor.incomeIntervalSeconds,
    upgradeCost: floor.upgradeCost,
    rateStep: floor.rateStep,
    upgradeCount: floor.upgradeCount,
    workers: getWorkerSlots(floor),
    unlocked: floor.unlocked,
    unlockCost: floor.unlockCost,
    workerCount: floor.workerCount,
    lastCollectedAt: floor.lastCollectedAt,
    bgIndex: floor.bgIndex,
    tintIndexes: getWorkerTintIndexes(floor),
    hasOfficeChairs: floor.hasOfficeChairs,
    hasOfficeSupplies: floor.hasOfficeSupplies,
    hasManager: floor.hasManager,
    critMultiplierTier: floor.critMultiplierTier,
    aboveCapTier: floor.aboveCapTier,
    overtimeTicks: floor.overtimeTicks,
    overtimeStartedAt: floor.overtimeStartedAt,
    overtimeCost: floor.overtimeCost,
    priceDiscountMultiplier: floor.priceDiscountMultiplier,
  };
}

export function saveBuildings(buildings: Floor[][], companyIndex = 0): void {
  const data: SavedFloor[][] = buildings.map((floors) =>
    floors.map(toSavedFloor),
  );
  const saved: SavedBuildings = {
    buildings: data,
  };
  try {
    localStorage.setItem(
      companyStorageKey(STORAGE_KEY, companyIndex),
      JSON.stringify(saved),
    );
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

const buildingSaveScheduler = createSaveScheduler<{
  buildings: Floor[][];
  companyIndex: number;
}>(({ buildings, companyIndex }) => saveBuildings(buildings, companyIndex));

export function schedulePersist(buildings: Floor[][], companyIndex = 0): void {
  buildingSaveScheduler.schedule({ buildings, companyIndex });
}

function fromSavedFloor(sf: SavedFloor): Floor {
  const floor: Floor = {
    bgIndex: sf.bgIndex ?? 0,
    incomeAmount: toBigNumber(sf.incomeAmount),
    incomeIntervalSeconds: sf.incomeIntervalSeconds,
    upgradeCost: toBigNumber(sf.upgradeCost),
    rateStep: toBigNumber(sf.rateStep),
    upgradeCount: sf.upgradeCount,
    unlocked: sf.unlocked,
    unlockCost: toBigNumber(sf.unlockCost),
    workerCount: sf.workerCount ?? 1,
    lastCollectedAt: sf.lastCollectedAt ?? Date.now(),
    hasOfficeChairs: sf.hasOfficeChairs ?? false,
    hasOfficeSupplies: sf.hasOfficeSupplies ?? false,
    hasManager: sf.hasManager ?? false,
    critMultiplierTier: sf.critMultiplierTier ?? null,
    aboveCapTier: sf.aboveCapTier ?? false,
    overtimeTicks: sf.overtimeTicks ?? 0,
    overtimeStartedAt: sf.overtimeStartedAt ?? null,
    overtimeCost:
      sf.overtimeCost !== undefined ? toBigNumber(sf.overtimeCost) : ZERO,
    priceDiscountMultiplier: sf.priceDiscountMultiplier ?? 1,
  };
  workerSlots.set(floor, sf.workers);
  workerTintIndexes.set(floor, sf.tintIndexes ?? sf.spriteIndexes ?? []);
  return floor;
}

// rebuilds Floor[][] (one Floor[] per building) from localStorage; returns [] if
// nothing is saved or storage is unreadable
export function loadBuildings(companyIndex = 0): Floor[][] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(companyStorageKey(STORAGE_KEY, companyIndex));
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed: SavedFloor[][] | SavedBuildings = JSON.parse(raw);
    const saved = Array.isArray(parsed) ? { buildings: parsed } : parsed;
    return saved.buildings.map((floors) =>
      floors.map((sf) => fromSavedFloor(sf)),
    );
  } catch {
    return [];
  }
}
