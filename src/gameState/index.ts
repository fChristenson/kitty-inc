import type { FurnitureSprite } from "../sprites/furnitureSprites";

const STORAGE_KEY = "cash-clicker:floors";

export interface WorkerSlot {
  boosted: boolean; // whether coinFloat.ts's floating-coin animation is active on this worker
  boostedAt: number; // performance.now() when boosted turned on; auto-resets BOOST_DURATION_MS later
}

const BOOST_DURATION_MS = 15_000; // boosted state auto-resets this long after being triggered

export interface FurniturePosition {
  img: HTMLImageElement;
  spriteIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Floor {
  furniture: FurniturePosition[];
  incomeAmount: number;
  incomeIntervalSeconds: number;
  upgradeCost: number; // $ needed to buy this floor's next upgrade; doubles per purchase
  rateStep: number; // $ added to incomeAmount per upgrade click
  upgradeCount: number; // how many upgrades have been bought on this floor
  unlocked: boolean;
  unlockCost: number; // 0 for floor 1 (always free); doubles starting from floor 2
  workerCount: number; // how many workers this floor has bought via workerMenu.ts; scales its boost strength
}

// gameState.ts is the sole owner of this per-floor data (Floor itself doesn't carry it),
// keyed by the floor itself the same way worker.ts tracks its own ephemeral walk state
const workerSlots = new WeakMap<Floor, WorkerSlot[]>();

function getWorkerSlots(floor: Floor): WorkerSlot[] {
  let slots = workerSlots.get(floor);
  if (!slots) {
    slots = [];
    workerSlots.set(floor, slots);
  }
  return slots;
}

// lazily grows a floor's slot list so each worker index gets its own independent
// boosted flag, instead of every worker on a floor sharing a single slot
function ensureSlot(floor: Floor, workerIndex: number): WorkerSlot {
  const slots = getWorkerSlots(floor);
  while (slots.length <= workerIndex) {
    slots.push({ boosted: false, boostedAt: -Infinity });
  }
  return slots[workerIndex];
}

function expireIfStale(slot: WorkerSlot, now: number): boolean {
  if (slot.boosted && now - slot.boostedAt >= BOOST_DURATION_MS) {
    slot.boosted = false;
  }
  return slot.boosted;
}

export function isBoosted(
  floor: Floor,
  workerIndex: number,
  now: number,
): boolean {
  return expireIfStale(ensureSlot(floor, workerIndex), now);
}

export function activateBoosted(
  floor: Floor,
  workerIndex: number,
  now: number,
): void {
  const slot = ensureSlot(floor, workerIndex);
  slot.boosted = true;
  slot.boostedAt = now;
}

// how many of a floor's workers are currently boosted; incomePanel.ts uses this to
// scale the income rate delay down per boosted worker
export function countBoostedWorkers(floor: Floor, now: number): number {
  return getWorkerSlots(floor).filter((slot) => expireIfStale(slot, now))
    .length;
}

interface SavedPlacement {
  spriteIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SavedFloor {
  furniture: SavedPlacement[];
  incomeAmount: number;
  incomeIntervalSeconds: number;
  upgradeCost: number;
  rateStep: number;
  upgradeCount: number;
  workers: WorkerSlot[];
  unlocked: boolean;
  unlockCost: number;
  workerCount?: number; // added after initial release; older saves default to 1 on load
}

export function clearFloors(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

export function saveFloors(floors: Floor[]): void {
  const data: SavedFloor[] = floors.map((floor) => ({
    furniture: floor.furniture.map((p) => ({
      spriteIndex: p.spriteIndex,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
    })),
    incomeAmount: floor.incomeAmount,
    incomeIntervalSeconds: floor.incomeIntervalSeconds,
    upgradeCost: floor.upgradeCost,
    rateStep: floor.rateStep,
    upgradeCount: floor.upgradeCount,
    workers: getWorkerSlots(floor),
    unlocked: floor.unlocked,
    unlockCost: floor.unlockCost,
    workerCount: floor.workerCount,
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

// rebuilds Floor[] from localStorage, resolving each placement's sprite image by index;
// returns [] if nothing is saved, storage is unreadable, or a referenced sprite no longer exists
export function loadFloors(sprites: FurnitureSprite[]): Floor[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const saved: SavedFloor[] = JSON.parse(raw);
    return saved.map((sf) => {
      const furniture: FurniturePosition[] = sf.furniture.map((sp) => {
        const sprite = sprites[sp.spriteIndex];
        if (!sprite) throw new Error(`missing sprite ${sp.spriteIndex}`);
        return {
          img: sprite.img,
          spriteIndex: sp.spriteIndex,
          x: sp.x,
          y: sp.y,
          w: sp.w,
          h: sp.h,
        };
      });
      const floor: Floor = {
        furniture,
        incomeAmount: sf.incomeAmount,
        incomeIntervalSeconds: sf.incomeIntervalSeconds,
        upgradeCost: sf.upgradeCost,
        rateStep: sf.rateStep,
        upgradeCount: sf.upgradeCount,
        unlocked: sf.unlocked,
        unlockCost: sf.unlockCost,
        workerCount: sf.workerCount ?? 1,
      };
      workerSlots.set(floor, sf.workers);
      return floor;
    });
  } catch {
    return [];
  }
}
