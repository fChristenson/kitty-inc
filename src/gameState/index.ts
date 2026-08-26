// bumped from "cash-clicker:floors" now that this holds Floor[][] (one entry per
// building) instead of a single Floor[] — old single-building saves just start fresh
const STORAGE_KEY = "cash-clicker:buildings";

export interface WorkerSlot {
  boosted: boolean; // whether coinFloat.ts's floating-coin animation is active on this worker
  boostedAt: number; // performance.now() when boosted turned on; auto-resets BOOST_DURATION_MS later
}

const BOOST_DURATION_MS = 15_000; // boosted state auto-resets this long after being triggered

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

const LAST_VISIT_KEY = "cash-clicker:last-visit";
const IDLE_INCOME_MIN_SECONDS = 1; // shorter gaps (e.g. a quick refresh) don't count as idle time — purely
// a cheap top-level bailout, separate from each floor's own lastCollectedAt bookkeeping below

// $ every unlocked floor across every building would have earned (at its own, unboosted
// rate) since it last completed a whole cycle, using real wall-clock time so it still
// counts while the tab was closed — unlike performance.now(), which resets every load.
// A floor can't earn faster than its own interval, so a gap shorter than that earns
// nothing *yet*: lastCollectedAt is only advanced by whole completed cycles, leaving
// any partial progress toward the next one intact for the next call to pick up, instead
// of a flat elapsed-time payout that ignores each floor's own rate. Must only be called
// once per page load (also stamps "now" as the new last-visit time for the quick-refresh gate).
export function computeIdleIncome(buildings: Floor[][]): number {
  let lastVisit: number | null = null;
  try {
    const raw = localStorage.getItem(LAST_VISIT_KEY);
    lastVisit = raw ? Number(raw) : null;
  } catch {
    lastVisit = null;
  }

  const now = Date.now();
  try {
    localStorage.setItem(LAST_VISIT_KEY, String(now));
  } catch {
    // storage unavailable: nothing to persist, idle income just won't be tracked next time
  }

  if (lastVisit === null || !Number.isFinite(lastVisit)) return 0;
  const elapsedSeconds = (now - lastVisit) / 1000;
  if (elapsedSeconds <= IDLE_INCOME_MIN_SECONDS) return 0;

  let idleIncome = 0;
  for (const floors of buildings) {
    for (const floor of floors) {
      if (!floor.unlocked) continue;
      const elapsedForFloor = (now - floor.lastCollectedAt) / 1000;
      const cycles = Math.floor(elapsedForFloor / floor.incomeIntervalSeconds);
      if (cycles <= 0) continue; // not a full cycle yet — leave lastCollectedAt untouched, timer keeps running
      floor.lastCollectedAt += cycles * floor.incomeIntervalSeconds * 1000;
      idleIncome += cycles * floor.incomeAmount;
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
}

export function clearBuildings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
  };
}

export function saveBuildings(buildings: Floor[][]): void {
  const data: SavedFloor[][] = buildings.map((floors) =>
    floors.map(toSavedFloor),
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
export function schedulePersist(buildings: Floor[][]): void {
  if (pendingSave !== null) return;
  const run = () => {
    pendingSave = null;
    saveBuildings(buildings);
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
  };
  workerSlots.set(floor, sf.workers);
  return floor;
}

// rebuilds Floor[][] (one Floor[] per building) from localStorage; returns [] if
// nothing is saved or storage is unreadable
export function loadBuildings(): Floor[][] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
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
