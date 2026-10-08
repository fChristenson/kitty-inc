// Persisted "how many times has each crit type landed" tally — a pure
// collectible/stat display for the "Special Crits" info menu (see
// hud/corporationBoostMenu), never read by any game logic. Global across
// every company (not company-scoped, unlike gameState.ts's saves) since it's
// the player's own lifetime collection progress, not any one company's
// economy. Only incremented from rollCrit's own real random rolls (see
// index.ts) — dev/test "force" buttons deliberately don't bump this, so
// testing a proc doesn't inflate the player's real collection count.
import type { CritProcKind } from "./index";
import { CONFIG } from "../../config";

const STORAGE_KEY = "cash-clicker:crit-proc-counts";
const FOIL_STORAGE_KEY = "cash-clicker:badge-foils";

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
let draftCounts: CritProcCounts | null = null;

export function withDraftCritCounts<T>(
  draft: CritProcCounts,
  action: () => T,
): T {
  const previous = draftCounts;
  draftCounts = draft;
  try {
    return action();
  } finally {
    draftCounts = previous;
  }
}

export function commitCritCounts(draft: CritProcCounts): void {
  for (const [kind, count] of Object.entries(draft)) {
    const key = kind as CritProcKind;
    counts[key] = (counts[key] ?? 0) + count;
  }
  saveCounts();
}

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
  if (draftCounts) {
    draftCounts[kind] = (draftCounts[kind] ?? 0) + 1;
    return;
  }
  const before = counts[kind] ?? 0;
  counts[kind] = before + 1;
  saveCounts();
}

export function getCritProcCount(kind: CritProcKind): number {
  return counts[kind] ?? 0;
}

// a lucky badge shimmers like a foil card, then glitters too; landing often
// enough only qualifies it for the roll
export type BadgeFoil = "shimmer" | "glitter";
export const BADGE_SHIMMER_AT = 10;
export const BADGE_GLITTER_AT = 100;

function loadFoils(): Partial<Record<CritProcKind, BadgeFoil>> {
  try {
    const raw = localStorage.getItem(FOIL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const foils = loadFoils();

function setBadgeFoil(kind: CritProcKind, foil: BadgeFoil): void {
  foils[kind] = foil;
  try {
    localStorage.setItem(FOIL_STORAGE_KEY, JSON.stringify(foils));
  } catch {
    // ignore storage failures, like the counts
  }
}

export function getBadgeFoil(kind: CritProcKind): BadgeFoil | null {
  return foils[kind] ?? null;
}

// a test-queued foil, else the luck rolls the badge qualifies for; the foil
// it lands is kept and returned for its reveal
export function rollBadgeFoil(kind: CritProcKind): BadgeFoil | null {
  const queued = pendingFoils.get(kind);
  pendingFoils.delete(kind);
  const count = getCritProcCount(kind);
  const current = foils[kind];
  const { badgeShimmerChance, badgeGlitterChance } = CONFIG.crit;
  let foil: BadgeFoil | null = queued ?? null;
  if (
    !foil &&
    current !== "glitter" &&
    count >= BADGE_GLITTER_AT &&
    Math.random() < badgeGlitterChance
  )
    foil = "glitter";
  else if (
    !foil &&
    !current &&
    count >= BADGE_SHIMMER_AT &&
    Math.random() < badgeShimmerChance
  )
    foil = "shimmer";
  if (foil) setBadgeFoil(kind, foil);
  return foil;
}

const pendingFoils = new Map<CritProcKind, BadgeFoil>();

// dev test hook: the next landing of `kind` reveals `foil`
export function queueBadgeFoilReveal(
  kind: CritProcKind,
  foil: BadgeFoil,
): void {
  pendingFoils.set(kind, foil);
}
