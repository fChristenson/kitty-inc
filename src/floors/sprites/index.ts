import { loadImage, randomInt } from "../../utils";

export interface FurnitureSprite {
  img: HTMLImageElement;
  targetHeight: number;
}

const spriteModules = import.meta.glob<string>(
  "../assets/sprites/sprite-*.png",
  {
    eager: true,
    import: "default",
  },
);
const spriteUrls = Object.keys(spriteModules)
  .sort()
  .map((key) => spriteModules[key]);

// target on-screen height (px) per sprite, grouped into 3 size tiers so tall pieces
// (bookcase, server rack, vending machine) render bigger than short ones (coffee
// table, stool) instead of all being stretched to one uniform height.
const SMALL_H = 130;
const MID_H = 210;
const BIG_H = 320;

// index matches the sorted sprite-NN.png order:
// 01 desk+monitor, 02 office chair, 03 desk, 04 armchair, 05 coffee table, 06 bookcase,
// 07 filing cabinet, 08 loveseat, 09 server rack, 10 potted plant, 11 vending machine, 12 bar stool
const FURNITURE_TARGET_HEIGHTS = [
  MID_H,
  MID_H,
  MID_H,
  MID_H,
  SMALL_H,
  BIG_H,
  MID_H,
  MID_H,
  BIG_H,
  MID_H,
  BIG_H,
  SMALL_H,
];
const DEFAULT_TARGET_HEIGHT = 120;

export async function loadFurnitureSprites(): Promise<FurnitureSprite[]> {
  const images = await Promise.all(spriteUrls.map(loadImage));
  return images.map((img, i) => ({
    img,
    targetHeight: FURNITURE_TARGET_HEIGHTS[i] ?? DEFAULT_TARGET_HEIGHT,
  }));
}

export function pickRandomSprites(
  sprites: FurnitureSprite[],
  count: number,
): FurnitureSprite[] {
  const pool = [...sprites];
  const picked: FurnitureSprite[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randomInt(0, pool.length - 1);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
