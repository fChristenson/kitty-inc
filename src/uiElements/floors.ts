import bgUrl from "../assets/bg.png";
import { loadImage, randomInt } from "../utils";
import {
  pickRandomSprites,
  type FurnitureSprite,
} from "../sprites/furnitureSprites";
import type { Floor, FurniturePosition } from "../gameState";

// native size of bg.png
export const FLOOR_W = 1248;
export const FLOOR_H = 721;

// the floor plane band inside each bg.png slice (rest is ceiling/walls/windows)
export const FLOOR_BOTTOM = 705;
export const FLOOR_X_MIN = 150;
export const FLOOR_X_MAX = 1100;
const FURNITURE_RISE = 60;

const BASE_INCOME_AMOUNT = 1; // ground floor's starting $/interval
// each floor above starts at 3x the previous floor's income amount, while the interval
// only doubles (see BASE_INCOME_INTERVAL_SECONDS) — so the effective $/s rate grows 1.5x
// per floor, rewarding climbing higher over sitting on low floors' faster-but-smaller payouts
const INCOME_GROWTH_FACTOR = 3;
const BASE_INCOME_INTERVAL_SECONDS = 1; // ground floor's payout interval; each floor above doubles it
const BASE_UPGRADE_COST = 1; // ground floor's starting upgrade price; each floor above doubles it
const BASE_UNLOCK_COST = 200; // floor 2's unlock price; each floor above doubles it
// each upgrade click's payoff scales exactly like the base income (same INCOME_GROWTH_FACTOR),
// so a floor's 1.5x-per-level rate advantage holds no matter how many upgrades it has bought —
// a flat step here would let enough flat-rate floor-1 upgrades out-earn a higher, unupgraded floor
const BASE_RATE_STEP = 2;

export function loadFloorBackground(): Promise<HTMLImageElement> {
  return loadImage(bgUrl);
}

// floorLevel is 1-indexed (1 = ground floor), matching the number shown by floorNumber.ts
export function buildFloor(
  sprites: FurnitureSprite[],
  floorLevel: number,
): Floor {
  const count = randomInt(2, 3);
  const chosen = pickRandomSprites(sprites, count);
  const usable = FLOOR_X_MAX - FLOOR_X_MIN;
  const slotWidth = usable / chosen.length;

  const furniture: FurniturePosition[] = chosen.map((sprite, i) => {
    const { img, targetHeight } = sprite;
    const spriteIndex = sprites.indexOf(sprite);
    const scale = targetHeight / img.naturalHeight;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const slotCenter = FLOOR_X_MIN + slotWidth * i + slotWidth / 2;
    const jitter = (Math.random() - 0.5) * slotWidth * 0.4;
    const x = Math.min(
      Math.max(slotCenter + jitter - w / 2, FLOOR_X_MIN),
      FLOOR_X_MAX - w,
    );
    const y = FLOOR_BOTTOM - h - FURNITURE_RISE;
    return { img, spriteIndex, x, y, w, h };
  });

  return {
    furniture,
    incomeAmount:
      Math.round(
        BASE_INCOME_AMOUNT * INCOME_GROWTH_FACTOR ** (floorLevel - 1) * 100,
      ) / 100,
    incomeIntervalSeconds: BASE_INCOME_INTERVAL_SECONDS * 2 ** (floorLevel - 1),
    upgradeCost: BASE_UPGRADE_COST * 2 ** (floorLevel - 1),
    rateStep:
      Math.round(
        BASE_RATE_STEP * INCOME_GROWTH_FACTOR ** (floorLevel - 1) * 100,
      ) / 100,
    upgradeCount: 0,
    unlocked: floorLevel === 1,
    unlockCost: floorLevel === 1 ? 0 : BASE_UNLOCK_COST * 2 ** (floorLevel - 2),
    workerCount: 1,
    lastCollectedAt: Date.now(),
  };
}

// draws one floor slab (background + its furniture) into its own canvas
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  bgImage: HTMLImageElement,
  floor: Floor,
): void {
  ctx.drawImage(bgImage, 0, 0, FLOOR_W, FLOOR_H);
  for (const p of floor.furniture) {
    ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
  }
}
