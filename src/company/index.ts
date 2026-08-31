// Each corporation (see corporationName.ts's naming, cityMap.ts's barrel-roll
// picker) runs its own completely separate game underneath — own buildings/
// floors, own totalIncome, own active building/map page, nothing shared between
// them (see gameState.ts/totalIncome.ts's companyStorageKey usage). This module
// just owns the single pointer to which one is currently loaded/on-screen,
// persisted so a reload resumes the same company.
const ACTIVE_COMPANY_KEY = "cash-clicker:active-company-index";

export function getActiveCompanyIndex(): number {
  try {
    const parsed = Number(localStorage.getItem(ACTIVE_COMPANY_KEY));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function setActiveCompanyIndex(index: number): void {
  try {
    localStorage.setItem(ACTIVE_COMPANY_KEY, String(index));
  } catch {
    // storage unavailable: nothing to persist
  }
}

// company 0 keeps every pre-existing plain key (cash-clicker:buildings,
// cash-clicker:total-income, etc.) so saves from before multi-company support
// existed aren't orphaned; every other company gets its own key namespaced by index
export function companyStorageKey(
  baseKey: string,
  companyIndex: number,
): string {
  return companyIndex === 0 ? baseKey : `${baseKey}:${companyIndex}`;
}

// a tiny persisted snapshot of a DORMANT (not currently active) company —
// everything totalIncome.ts/corporationBoostMenu.ts need to project that
// company's income and value without ever loading its full buildings/floors
// array (which only the one currently-active company keeps in memory/reloads
// from storage). Written once, right when a company stops being active (see
// main.ts's switchToCompany) — a dormant company's own buildings/upgrades never
// change while it's dormant, so this stays valid until the player switches back
// to it, changes something, and switches away again
export interface CompanySummary {
  incomeRatePerSecond: number; // already boost-multiplier-adjusted as of updatedAt
  assetValue: number; // buildings value + upgrades value combined
  updatedAt: number; // Date.now() at snapshot time
}

const COMPANY_SUMMARY_KEY = "cash-clicker:company-summary";

export function saveCompanySummary(
  companyIndex: number,
  summary: CompanySummary,
): void {
  try {
    localStorage.setItem(
      companyStorageKey(COMPANY_SUMMARY_KEY, companyIndex),
      JSON.stringify(summary),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

export function loadCompanySummary(
  companyIndex: number,
): CompanySummary | null {
  try {
    const raw = localStorage.getItem(
      companyStorageKey(COMPANY_SUMMARY_KEY, companyIndex),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.incomeRatePerSecond !== "number" ||
      typeof parsed?.assetValue !== "number" ||
      typeof parsed?.updatedAt !== "number"
    ) {
      return null;
    }
    return parsed as CompanySummary;
  } catch {
    return null;
  }
}
