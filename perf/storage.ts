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
  // unlocked floors in each building
  floors: number;
  // buildings in the company, each with `floors` floors; the last is on screen
  buildings: number;
  // companies, every one a copy of the first
  companies: number;
  // every worker boosted, half of them perma tiers, managers on every floor
  heavy: boolean;
  // heavy, but every figure at the top perma tier and the bars overspeeding
  maxed: boolean;
  // every floor's level, when set
  level: number | null;
  // powers of ten added to every amount (totals, income, costs), so only the
  // numbers' size changes, not what's affordable
  money: number;
}

interface SavedWorker {
  boosted: boolean;
  boostedAt: number;
  durationMs?: number;
  permaTier?: string;
}
type SavedFloor = Record<string, unknown> & { workers?: SavedWorker[] };
interface Big {
  mantissa: number;
  exponent: number;
}

const MONEY_FIELDS = [
  "incomeAmount",
  "rateStep",
  "upgradeCost",
  "unlockCost",
  "buildingPurchaseCost",
];
// each building earns and costs 1000x the one before, like the game's own
const BUILDING_EXPONENT = 3;
// floors/floorLock's MAX_FLOORS_PER_BUILDING (not imported: game modules must
// only load once the memory storage is in place)
const MAX_FLOORS = 20;

function scaleMoney(floor: SavedFloor, exponent: number): void {
  for (const field of MONEY_FIELDS) {
    const value = floor[field] as Big | undefined;
    if (value && typeof value === "object" && value.mantissa !== 0)
      floor[field] = { ...value, exponent: value.exponent + exponent };
  }
}

const big = (exponent: number): Big => ({ mantissa: 1, exponent });

// loads the fresh save, grown into a busy company, as the game's storage
export function loadFixture({
  floors,
  buildings,
  companies,
  heavy,
  maxed,
  level,
  money,
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
  const buildFloors = (building: number): SavedFloor[] => {
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
        floor.managerPermaTier = maxed ? "ultra" : i % 3 === 0 ? "mega" : null;
      }
      if (maxed) {
        floor.upgradeCount = 400;
        floor.incomeIntervalSeconds = 0.01;
      }
      if (level !== null) floor.upgradeCount = level;
      scaleMoney(floor, building * BUILDING_EXPONENT + money);
      built.push(floor);
    }
    if (locked && floors < MAX_FLOORS) {
      const next: SavedFloor = structuredClone(locked);
      scaleMoney(next, building * BUILDING_EXPONENT + money);
      built.push(next);
    }
    return built;
  };
  save.buildings = Array.from({ length: buildings }, (_, b) => buildFloors(b));
  const saved = JSON.stringify(save);
  const top = buildings * BUILDING_EXPONENT + money;
  const names = JSON.parse(
    base["cash-clicker:corporation-names"] ?? "[]",
  ) as string[];
  const records = [];
  for (let c = 0; c < companies; c++) {
    const suffix = c === 0 ? "" : `:${c}`;
    memory.setItem(`cash-clicker:buildings${suffix}`, saved);
    memory.setItem(
      `cash-clicker:active-building-index${suffix}`,
      String(buildings - 1),
    );
    names[c] ??= `Perf Corp ${c + 1}`;
    records.push({
      upgradeEconomyVersion: ground.upgradeEconomyVersion,
      bankedTotal: big(top + 40),
      incomeRatePerSecond: big(top + 30),
      assetValue: big(top + 45),
      upgradesValue: big(top + 44),
      updatedAt: now,
    });
  }
  if (companies > 1 || buildings > 1 || money > 0) {
    memory.setItem("cash-clicker:corporation-names", JSON.stringify(names));
    memory.setItem("cash-clicker:corporations", JSON.stringify(records));
    memory.setItem("cash-clicker:active-company-index", "0");
  }
}
