import bgUrl from "./assets/bg.png";
import { loadImage, randomInt } from "./utils";
import { pickRandomSprites, type FurnitureSprite } from "./sprites";

// native size of bg.png
export const FLOOR_W = 1248;
export const FLOOR_H = 721;

// the floor plane band inside each bg.png slice (rest is ceiling/walls/windows)
const FLOOR_BOTTOM = 705;
const FLOOR_X_MIN = 150;
const FLOOR_X_MAX = 1100;
const FURNITURE_RISE = 60;

export interface Placement {
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Floor {
  furniture: Placement[];
}

export function loadFloorBackground(): Promise<HTMLImageElement> {
  return loadImage(bgUrl);
}

export function buildFloor(sprites: FurnitureSprite[]): Floor {
  const count = randomInt(2, 3);
  const chosen = pickRandomSprites(sprites, count);
  const usable = FLOOR_X_MAX - FLOOR_X_MIN;
  const slotWidth = usable / chosen.length;

  const furniture: Placement[] = chosen.map(({ img, targetHeight }, i) => {
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
    return { img, x, y, w, h };
  });

  return { furniture };
}

// draws one floor slab (background + its furniture) at the given vertical offset in the building canvas
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  bgImage: HTMLImageElement,
  floor: Floor,
  offsetY: number,
): void {
  ctx.drawImage(bgImage, 0, offsetY, FLOOR_W, FLOOR_H);
  for (const p of floor.furniture) {
    ctx.drawImage(p.img, p.x, p.y + offsetY, p.w, p.h);
  }
}
