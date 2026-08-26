import bgUrl from "../assets/bg.png";
import { loadImage, randomInt } from "../utils";
import { pickRandomSprites, type FurnitureSprite } from "./sprites";
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

// floorLevel is 1-indexed (1 = ground floor), matching the number shown by floorNumber.ts.
// multiplier scales every $ base value (buildings/index.ts's 1000x-per-building economy);
// groundFloorLocked forces floor 1 to start locked/priced instead of the usual free ground
// floor — used for every building after the first one (buildings/index.ts spawns those locked)
export function buildFloor(
  sprites: FurnitureSprite[],
  floorLevel: number,
  multiplier = 1,
  groundFloorLocked = false,
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

  const isGroundFloor = floorLevel === 1;
  const unlockCost = isGroundFloor
    ? groundFloorLocked
      ? BASE_UNLOCK_COST * multiplier
      : 0
    : BASE_UNLOCK_COST * multiplier * 2 ** (floorLevel - 2);

  return {
    furniture,
    incomeAmount:
      Math.round(
        BASE_INCOME_AMOUNT *
          multiplier *
          INCOME_GROWTH_FACTOR ** (floorLevel - 1) *
          100,
      ) / 100,
    incomeIntervalSeconds: BASE_INCOME_INTERVAL_SECONDS * 2 ** (floorLevel - 1),
    upgradeCost: BASE_UPGRADE_COST * multiplier * 2 ** (floorLevel - 1),
    rateStep:
      Math.round(
        BASE_RATE_STEP *
          multiplier *
          INCOME_GROWTH_FACTOR ** (floorLevel - 1) *
          100,
      ) / 100,
    upgradeCount: 0,
    unlocked: isGroundFloor && !groundFloorLocked,
    unlockCost,
    workerCount: 1,
    lastCollectedAt: Date.now(),
  };
}

// draws one floor slab (background + its furniture); ctx must already be translated
// so this floor's own top-left is at (0, 0)
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

// decorative strip beneath the ground floor (grass top edge + dirt below); ctx must
// already be translated to this strip's own top-left. width spans the whole building
// slot (floor room art + both side gutters), not just the room's own FLOOR_W, so the
// ground reads as continuous dirt/grass under the gutters' sky-blue strips too
export const GROUND_H = 310;

export function drawGround(ctx: CanvasRenderingContext2D, width: number): void {
  const dirtGradient = ctx.createLinearGradient(0, 0, 0, GROUND_H);
  dirtGradient.addColorStop(0, "#8a5a2b");
  dirtGradient.addColorStop(1, "#6b4321");
  ctx.fillStyle = dirtGradient;
  ctx.fillRect(0, 0, width, GROUND_H);

  const stripeH = 48;
  const stripeW = 30;
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(0, 0, width, stripeH);
  ctx.fillStyle = "#22c55e";
  for (let x = 0; x < width; x += stripeW * 2) {
    ctx.fillRect(x, 0, stripeW, stripeH);
  }
  ctx.fillStyle = "#15803d";
  ctx.fillRect(0, stripeH - 4, width, 4);
}
