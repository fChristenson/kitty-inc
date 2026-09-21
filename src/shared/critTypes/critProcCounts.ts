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

// Writing straight through on every landed proc meant a synchronous
// JSON.stringify + localStorage.setItem per crit (~60us each), which a bulk
// buy landing thousands of procs turns into a visible freeze. The in-memory
// tally stays exact and synchronous; only the write is coalesced.
let saveScheduled = false;

function writeCounts(): void {
  saveScheduled = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore storage failures (private browsing / full quota) — same as
    // every other persistence call in this codebase
  }
}

function saveCounts(): void {
  if (saveScheduled) return;
  saveScheduled = true;
  // setTimeout, not requestAnimationFrame: a backgrounded tab pauses rAF
  // entirely, which would strand the pending tally indefinitely
  setTimeout(writeCounts, 0);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (saveScheduled) writeCounts();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && saveScheduled) writeCounts();
  });
}

export function recordCritProcLanded(kind: CritProcKind): void {
  counts[kind] = (counts[kind] ?? 0) + 1;
  saveCounts();
}

export function getCritProcCount(kind: CritProcKind): number {
  return counts[kind] ?? 0;
}
