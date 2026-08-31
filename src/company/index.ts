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
