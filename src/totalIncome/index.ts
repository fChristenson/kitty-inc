import type { Floor } from "../gameState";
import { collectDueIncome } from "../floors";

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
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

const STORAGE_KEY = "cash-clicker:total-income";
const SAVE_INTERVAL_MS = 1000;

function loadStoredTotal(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveStoredTotal(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

let totalIncome = loadStoredTotal();

// pays out each unlocked floor's income (across every building) only once its fill-bar
// cycle actually completes, instead of accruing fractional $ continuously underneath a
// bar that looks stepped. Uses setInterval (not requestAnimationFrame) so floor.
// lastCollectedAt keeps advancing even while this tab is open but unfocused/backgrounded
// — browsers throttle rAF to near-zero there, which let it go stale for however long the
// tab sat in the background, so gameState.ts's computeIdleIncome wrongly treated that
// whole span as idle time on the next load even though the tab was never closed.
// Also catches up immediately on visibilitychange, in case the interval itself got
// suspended for a long background/sleep stretch. reads the same buildings array
// reference every tick, so a building bought later is automatically included without
// needing to restart the ticker. read the running total via getTotalIncome()
const COLLECT_INTERVAL_MS = 200;

export function startTotalIncomeTicker(buildings: Floor[][]): void {
  let lastSave = performance.now();
  function collectAll(): void {
    // Date.now()-based (not performance.now()) since collectDueIncome now reads/writes
    // floor.lastCollectedAt directly, a persisted Date.now()-based timestamp
    const now = Date.now();
    for (const floors of buildings) {
      for (const floor of floors) {
        if (!floor.unlocked) continue;
        totalIncome += collectDueIncome(floor, now);
      }
    }

    const nowPerf = performance.now();
    if (nowPerf - lastSave >= SAVE_INTERVAL_MS) {
      lastSave = nowPerf;
      saveStoredTotal(totalIncome);
    }
  }

  setInterval(collectAll, COLLECT_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") collectAll();
  });

  window.addEventListener("beforeunload", () => saveStoredTotal(totalIncome));
}
