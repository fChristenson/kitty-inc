// Persisted "how many times has each crit type landed" tally — a pure
// collectible/stat display for the "Special Crits" info menu (see
// hud/corporationBoostMenu), never read by any game logic. Global across
// every company (not company-scoped, unlike gameState.ts's saves) since it's
// the player's own lifetime collection progress, not any one company's
// economy. Only incremented from rollCrit's own real random rolls (see
// index.ts) — dev/test "force" buttons deliberately don't bump this, so
// testing a proc doesn't inflate the player's real collection count.
import type { CritProcKind } from "./index";

const STORAGE_KEY = "cash-clicker:crit-proc-counts";

type CritProcCounts = Partial<Record<CritProcKind, number>>;

function loadCounts(): CritProcCounts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const counts: CritProcCounts = loadCounts();

function saveCounts(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore storage failures (private browsing / full quota) — same as
    // every other persistence call in this codebase
  }
}

export function recordCritProcLanded(kind: CritProcKind): void {
  counts[kind] = (counts[kind] ?? 0) + 1;
  saveCounts();
}

export function getCritProcCount(kind: CritProcKind): number {
  return counts[kind] ?? 0;
}
