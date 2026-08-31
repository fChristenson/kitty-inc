import { isStorageIntact, type Floor } from "../gameState";
import { collectDueIncome } from "../floors";
import { getActiveCompanyIndex, companyStorageKey } from "../company";

export function getTotalIncome(): number {
  return totalIncome;
}

// deducts amount from the running total if affordable; returns whether the spend succeeded
export function spendTotalIncome(amount: number): boolean {
  if (totalIncome < amount) return false;
  totalIncome -= amount;
  return true;
}

// adds amount to the running total; used by the "Add Money" dev/test control
export function addTotalIncome(amount: number): void {
  totalIncome += amount;
}

export function clearTotalIncome(): void {
  // also zero the in-memory value: location.reload() fires beforeunload first,
  // and that handler re-saves whatever totalIncome currently holds
  totalIncome = 0;
  try {
    localStorage.removeItem(companyStorageKey(STORAGE_KEY, activeCompanyIndex));
  } catch {
    // storage unavailable: nothing to clear
  }
}

const STORAGE_KEY = "cash-clicker:total-income";
const SAVE_INTERVAL_MS = 1000;

function loadStoredTotal(companyIndex: number): number {
  try {
    const value = Number(
      localStorage.getItem(companyStorageKey(STORAGE_KEY, companyIndex)),
    );
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveStoredTotal(companyIndex: number, value: number): void {
  try {
    localStorage.setItem(
      companyStorageKey(STORAGE_KEY, companyIndex),
      String(value),
    );
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

// which company's total the module-level totalIncome/tickerBuildings below
// currently belong to — swapped by switchActiveCompany, never shared across
// companies (see company.ts)
let activeCompanyIndex = getActiveCompanyIndex();
let totalIncome = loadStoredTotal(activeCompanyIndex);
// whichever company's buildings the ticker is currently collecting idle income
// from; set by startTotalIncomeTicker at startup, swapped by switchActiveCompany
let tickerBuildings: Floor[][] = [];

// call when the player switches to a different company (see cityMap's barrel
// roll / main.ts): saves the outgoing company's total immediately, then loads
// the new one's own total and points the running ticker at its own buildings —
// its floors' own lastCollectedAt timestamps mean the very next tick correctly
// pays out however much idle income piled up while this company wasn't active
export function switchActiveCompany(
  companyIndex: number,
  buildings: Floor[][],
): void {
  saveStoredTotal(activeCompanyIndex, totalIncome);
  activeCompanyIndex = companyIndex;
  totalIncome = loadStoredTotal(companyIndex);
  tickerBuildings = buildings;
}

// pays out each unlocked floor's income (across every building) only once its fill-bar
// cycle actually completes, instead of accruing fractional $ continuously underneath a
// bar that looks stepped. Uses setInterval (not requestAnimationFrame) so floor.
// lastCollectedAt keeps advancing even while this tab is open but unfocused/backgrounded
// — browsers throttle rAF to near-zero there, which let it go stale for however long the
// tab sat in the background, so gameState.ts's computeIdleIncome wrongly treated that
// whole span as idle time on the next load even though the tab was never closed.
// Also catches up immediately on visibilitychange, in case the interval itself got
// suspended for a long background/sleep stretch. reads tickerBuildings fresh every
// tick, so a building bought later — or a whole different company switched in via
// switchActiveCompany — is automatically included without needing to restart this.
// read the running total via getTotalIncome()
const COLLECT_INTERVAL_MS = 200;

export function startTotalIncomeTicker(buildings: Floor[][]): void {
  tickerBuildings = buildings;
  let lastSave = performance.now();
  function collectAll(): void {
    // Date.now()-based (not performance.now()) since collectDueIncome now reads/writes
    // floor.lastCollectedAt directly, a persisted Date.now()-based timestamp
    const now = Date.now();
    for (const floors of tickerBuildings) {
      for (const floor of floors) {
        if (!floor.unlocked) continue;
        totalIncome += collectDueIncome(floor, now);
      }
    }

    const nowPerf = performance.now();
    if (nowPerf - lastSave >= SAVE_INTERVAL_MS) {
      lastSave = nowPerf;
      // same guard as the beforeunload save below — otherwise this periodic
      // autosave would silently undo a manual localStorage clear within ~1s of
      // it happening, even before the player gets a chance to close the tab
      if (isStorageIntact()) saveStoredTotal(activeCompanyIndex, totalIncome);
    }
  }

  setInterval(collectAll, COLLECT_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") collectAll();
  });

  window.addEventListener("beforeunload", () => {
    if (!isStorageIntact()) return;
    saveStoredTotal(activeCompanyIndex, totalIncome);
  });
}
