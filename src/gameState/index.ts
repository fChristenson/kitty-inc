import type { FurnitureSprite } from "../sprites/furnitureSprites";

const STORAGE_KEY = "cash-clicker:floors";

export interface WorkerSlot {
  boosted: boolean; // whether coinFloat.ts's floating-coin animation is active on this worker
}

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
}

// gameState.ts is the sole owner of this per-floor data (Floor itself doesn't carry it),
// keyed by the floor itself the same way worker.ts tracks its own ephemeral walk state
const workerSlots = new WeakMap<Floor, WorkerSlot[]>();

function getWorkerSlots(floor: Floor): WorkerSlot[] {
  let slots = workerSlots.get(floor);
  if (!slots) {
    slots = [{ boosted: false }];
    workerSlots.set(floor, slots);
  }
  return slots;
}

export function isBoosted(floor: Floor): boolean {
  return getWorkerSlots(floor)[0].boosted;
}

export function toggleBoosted(floor: Floor): void {
  const slot = getWorkerSlots(floor)[0];
  slot.boosted = !slot.boosted;
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
      };
      workerSlots.set(floor, sf.workers);
      return floor;
    });
  } catch {
    return [];
  }
}
