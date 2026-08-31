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

// the ONLY persisted record of a DORMANT (not currently active) company's money/
// value — everything totalIncome.ts/corporationBoostMenu.ts need to derive that
// company's current total and value without ever loading its full buildings/
// floors array. bankedTotal and updatedAt are always written TOGETHER, in one
// call, by whichever single write actually changes them (main.ts's
// switchToCompany snapshotting the outgoing company, or totalIncome.ts spending
// from/autosaving a dormant one) — there is deliberately no separate "just the
// total" key anywhere else that could get out of sync with this and silently
// leave a company's total stuck (this was a real bug: the old design kept the
// banked $ in one key and the rate/timestamp in another, and a spend against a
// dormant company only ever updated the $ key, so the elapsed-time projection
// kept compounding against a stale timestamp forever after)
export interface CompanyRecord {
  bankedTotal: number; // $ actually banked as of updatedAt
  incomeRatePerSecond: number; // frozen as of updatedAt; only the active company's own rate can change
  assetValue: number; // buildings value + upgrades value combined, frozen as of updatedAt
  updatedAt: number; // Date.now() this record was last written
}

// every company's own record lives together in ONE array under ONE key — not one
// localStorage entry per company — so there's a single object to reason about
// (and a single atomic read-modify-write per update, never partial/racing writes
// split across several keys)
const CORPORATIONS_KEY = "cash-clicker:corporations";

function loadAllCompanyRecords(): (CompanyRecord | null)[] {
  try {
    const raw = localStorage.getItem(CORPORATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllCompanyRecords(records: (CompanyRecord | null)[]): void {
  try {
    localStorage.setItem(CORPORATIONS_KEY, JSON.stringify(records));
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

export function loadCompanyRecord(companyIndex: number): CompanyRecord | null {
  const record = loadAllCompanyRecords()[companyIndex];
  if (
    !record ||
    typeof record.bankedTotal !== "number" ||
    typeof record.incomeRatePerSecond !== "number" ||
    typeof record.assetValue !== "number" ||
    typeof record.updatedAt !== "number"
  ) {
    return null;
  }
  return record;
}

// the only way any code should ever persist a company's income/value snapshot —
// always overwrites the whole record in one atomic write (read-modify-write the
// single shared array), never just one field of it
export function saveCompanyRecord(
  companyIndex: number,
  record: CompanyRecord,
): void {
  const all = loadAllCompanyRecords();
  all[companyIndex] = record;
  saveAllCompanyRecords(all);
}

// wipes a single company's record (see hud/testButton's per-active-company reset)
export function clearCompanyRecord(companyIndex: number): void {
  const all = loadAllCompanyRecords();
  if (companyIndex < all.length) {
    all[companyIndex] = null;
    saveAllCompanyRecords(all);
  }
}
