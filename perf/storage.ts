// The game runs on an in-memory localStorage seeded from a fixture, so the rig
// never touches your real dev save and every run starts from the same state.

// the real storage, kept for the rig's own keys (fixture, baseline, results)
export const realStorage = window.localStorage;
const BASE_KEY = "perf-rig:base";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  entries(): Record<string, string> {
    return Object.fromEntries(this.map);
  }
}

export const memory = new MemoryStorage();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  get: () => memory,
});

// the fresh game's own first save, captured once by seedBase
export function hasBase(): boolean {
  return realStorage.getItem(BASE_KEY) !== null;
}

export function clearBase(): void {
  realStorage.removeItem(BASE_KEY);
}

// boots against empty storage, then keeps the fresh save the game wrote
export async function seedBase(): Promise<void> {
  const deadline = performance.now() + 15_000;
  while (!memory.getItem("cash-clicker:buildings")) {
    if (performance.now() > deadline)
      throw new Error("the game never wrote its first save");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  realStorage.setItem(BASE_KEY, JSON.stringify(memory.entries()));
}

export interface FixtureOptions {
  // unlocked floors in the building
  floors: number;
  // every worker boosted, half of them perma tiers, managers on every floor
  heavy: boolean;
  // heavy, but every figure at the top perma tier and the bars overspeeding
  maxed: boolean;
  // every floor's level, when set
  level: number | null;
}

interface SavedWorker {
  boosted: boolean;
  boostedAt: number;
  durationMs?: number;
  permaTier?: string;
}
type SavedFloor = Record<string, unknown> & { workers?: SavedWorker[] };

// loads the fresh save, grown into a busy building, as the game's storage
export function loadFixture({
  floors,
  heavy,
  maxed,
  level,
}: FixtureOptions): void {
  const base = JSON.parse(realStorage.getItem(BASE_KEY)!) as Record<
    string,
    string
  >;
  memory.clear();
  for (const [key, value] of Object.entries(base)) memory.setItem(key, value);
  // no idle income overlay: the save looks like it was never closed
  memory.removeItem("cash-clicker:last-close");
  const save = JSON.parse(base["cash-clicker:buildings"]) as {
    buildings: SavedFloor[][];
  };
  const [ground, locked] = save.buildings[0];
  const now = Date.now();
  const built: SavedFloor[] = [];
  for (let i = 0; i < floors; i++) {
    const floor: SavedFloor = structuredClone(ground);
    floor.unlocked = true;
    floor.bgIndex = i % 3;
    floor.lastCollectedAt = now;
    if (heavy || maxed) {
      floor.workerCount = 3;
      floor.hasManager = true;
      floor.hasOfficeChairs = true;
      floor.hasOfficeSupplies = true;
      floor.tintIndexes = [1, 2, 3];
      floor.workers = [0, 1, 2].map((k) => ({
        boosted: true,
        boostedAt: now,
        durationMs: 3_600_000,
        permaTier: maxed || (i % 2 === 0 && k < 2) ? "ultra" : undefined,
      }));
      floor.managerPermaTier = maxed
        ? "ultra"
        : i % 3 === 0
          ? "mega"
          : null;
    }
    if (maxed) {
      floor.upgradeCount = 400;
      floor.incomeIntervalSeconds = 0.01;
    }
    if (level !== null) floor.upgradeCount = level;
    built.push(floor);
  }
  if (locked) built.push(locked);
  save.buildings[0] = built;
  memory.setItem("cash-clicker:buildings", JSON.stringify(save));
}
