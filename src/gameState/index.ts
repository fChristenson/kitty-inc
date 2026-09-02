import { companyStorageKey } from "../company";

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
  boostedAt: number; // Date.now() when boosted turned on; auto-resets BOOST_DURATION_MS later
}

const BOOST_DURATION_MS = 15_000; // boosted state auto-resets this long after being triggered
// floors/coinFloat.ts blinks a boosted worker's floating coins once this little
// time is left, so letting a boost run out down to the wire visibly reads as
// "about to lose this" instead of it just quietly expiring
export const BOOST_URGENT_THRESHOLD_MS = 5_000;

export interface Floor {
  bgIndex: number; // which loaded shop background this floor draws (floors/index.ts)
  incomeAmount: number;
  incomeIntervalSeconds: number;
  upgradeCost: number; // $ needed to buy this floor's next upgrade; doubles per purchase
  rateStep: number; // $ added to incomeAmount per upgrade click
  upgradeCount: number; // how many upgrades have been bought on this floor
  unlocked: boolean;
  unlockCost: number; // 0 for floor 1 (always free); doubles starting from floor 2
  workerCount: number; // how many workers this floor has bought via workerMenu.ts; scales its boost strength
  lastCollectedAt: number; // Date.now() ms this floor last completed a whole idle-income cycle
  hasOfficeChairs: boolean; // one-time per-floor purchase (hud/upgradeMenu); never resets once true
  hasOfficeSupplies: boolean; // one-time per-floor purchase (hud/upgradeMenu); never resets once true
  hasManager: boolean; // one-time per-floor purchase (hud/upgradeMenu); never resets once true
  // permanent per-floor rate multiplier, rolled once when the floor is bought/
  // unlocked (see floorInteractions.ts's rollFloorBuyCrit) — never re-rolled or
  // cleared afterward. Mirrors floors/upgradeButton's CritTier as a plain string
  // union (not imported) to avoid a gameState<->floors circular import
  critMultiplierTier: "crit" | "mega" | "ultra" | null;
  // set once at creation (floors/index.ts's buildFloor) when this floor's
  // natural, uncapped incomeIntervalSeconds already exceeds incomePanel.ts's
  // MAX_INCOME_INTERVAL_SECONDS (1h) cap — never recomputed afterward, even as
  // upgrades keep halving its actual interval well below 1h. Lets
  // increaseIncomeRate charge a steeper per-upgrade cost growth on these
  // floors, since every upgrade here is worth more (it wasn't "supposed" to
  // earn this fast) than the same upgrade on a floor that was never capped
  aboveCapTier: boolean;
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
  if (slot.boosted && now - slot.boostedAt >= BOOST_DURATION_MS) {
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

export function activateBoosted(
  floor: Floor,
  workerIndex: number,
  now: number,
): void {
  const slot = ensureSlot(floor, workerIndex);
  slot.boosted = true;
  slot.boostedAt = now;
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
  return Math.max(0, BOOST_DURATION_MS - (now - slot.boostedAt));
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
export function computeIdleIncome(
  buildings: Floor[][],
  incomeBoostMultiplier = 1,
): number {
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
  if (elapsedSeconds <= IDLE_INCOME_MIN_SECONDS) return 0;

  let idleIncome = 0;
  for (const floors of buildings) {
    for (const floor of floors) {
      if (!floor.unlocked) continue;
      const ratePerSecond = floor.incomeAmount / floor.incomeIntervalSeconds;
      idleIncome += ratePerSecond * elapsedSeconds * incomeBoostMultiplier;
      // this whole idle span was just paid out in one lump sum, so the floor's next
      // cycle correctly starts fresh from right now
      floor.lastCollectedAt = now;
    }
  }
  return idleIncome;
}

interface SavedFloor {
  incomeAmount: number;
  incomeIntervalSeconds: number;
  upgradeCost: number;
  rateStep: number;
  upgradeCount: number;
  workers: WorkerSlot[];
  unlocked: boolean;
  unlockCost: number;
  workerCount?: number; // added after initial release; older saves default to 1 on load
  lastCollectedAt?: number; // added after initial release; older saves default to now() on load
  bgIndex?: number; // added after initial release; older saves default to 0 on load
  spriteIndexes?: number[]; // renamed to tintIndexes; kept only so very old saves parse
  tintIndexes?: number[]; // added after initial release; older saves default to [] on load
  hasOfficeChairs?: boolean; // added after initial release; older saves default to false on load
  hasOfficeSupplies?: boolean; // added after initial release; older saves default to false on load
  hasManager?: boolean; // added after initial release; older saves default to false on load
  critMultiplierTier?: "crit" | "mega" | "ultra" | null; // added after initial release; older saves default to null on load
  aboveCapTier?: boolean; // added after initial release; older saves default to false on load
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
  };
}

export function saveBuildings(buildings: Floor[][], companyIndex = 0): void {
  const data: SavedFloor[][] = buildings.map((floors) =>
    floors.map(toSavedFloor),
  );
  try {
    localStorage.setItem(
      companyStorageKey(STORAGE_KEY, companyIndex),
      JSON.stringify(data),
    );
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

let pendingSave: number | null = null;

// schedules saveBuildings to run once the browser is idle (or after a short fallback
// delay on engines without requestIdleCallback, e.g. Safari) instead of serializing
// every building's floors + writing to localStorage synchronously inside a click
// handler. Calls made while one is already pending are free — the next run always
// reads the current buildings array, so rapid clicks/purchases collapse into one write
// instead of janking a frame the user might also be mid-scroll on.
export function schedulePersist(buildings: Floor[][], companyIndex = 0): void {
  if (pendingSave !== null) return;
  const run = () => {
    pendingSave = null;
    saveBuildings(buildings, companyIndex);
  };
  if (typeof requestIdleCallback === "function") {
    pendingSave = requestIdleCallback(run, { timeout: 1000 });
  } else {
    pendingSave = window.setTimeout(run, 200);
  }
}

function fromSavedFloor(sf: SavedFloor): Floor {
  const floor: Floor = {
    bgIndex: sf.bgIndex ?? 0,
    incomeAmount: sf.incomeAmount,
    incomeIntervalSeconds: sf.incomeIntervalSeconds,
    upgradeCost: sf.upgradeCost,
    rateStep: sf.rateStep,
    upgradeCount: sf.upgradeCount,
    unlocked: sf.unlocked,
    unlockCost: sf.unlockCost,
    workerCount: sf.workerCount ?? 1,
    lastCollectedAt: sf.lastCollectedAt ?? Date.now(),
    hasOfficeChairs: sf.hasOfficeChairs ?? false,
    hasOfficeSupplies: sf.hasOfficeSupplies ?? false,
    hasManager: sf.hasManager ?? false,
    critMultiplierTier: sf.critMultiplierTier ?? null,
    aboveCapTier: sf.aboveCapTier ?? false,
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
    const saved: SavedFloor[][] = JSON.parse(raw);
    return saved.map((floors) => floors.map((sf) => fromSavedFloor(sf)));
  } catch {
    return [];
  }
}
