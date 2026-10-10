import { loadImage, loadImageEarly } from "../utils";
import type { CRIT_IMAGE_FILES } from "../crits/critIcons";

const PUBLIC_ASSET_BASE = import.meta.env.BASE_URL;
const themeAssetUrl = (filename: string) => `${PUBLIC_ASSET_BASE}${filename}`;
const critAssetUrl = (filename: string) => `${PUBLIC_ASSET_BASE}${filename}`;
const sharedThemeImages = new Set([
  "city.webp",
  "mapBg.webp",
  "wallMaterial.webp",
  "coin.webp",
  "mouse.webp",
  "isometricBox.webp",
  "isometricYarn.webp",
  "merge.webp",
  "skyscraper.webp",
  "cashRegister.webp",
  "clock.webp",
  "slotsFrame.webp",
]);
const backgroundFiles = ["bg2.webp", "bg4.webp", "bg6.webp"];
const cloudFiles = [
  "cloud0.webp",
  "cloud1.webp",
  "cloud2.webp",
  "cloud3.webp",
  "cloud4.webp",
];

// Every sprite this game loads, by logical name -> its filename in public/assets/.
const SPRITE_FILES = {
  worker: "workerWalk.webp",
  workerRapper: "workerRapper.webp",
  manager: "managerWalk.webp",
  managerDiva: "managerDiva.webp",
  coinSpin: "coinSpin.webp",
  cashBill: "cashBillFlutter.webp",
} as const;
export type SpriteName = keyof typeof SPRITE_FILES;

// every flat single-file image this game loads, by logical name -> its filename
// inside dist/ root — same reasoning as SPRITE_FILES above
export const IMAGE_FILES = {
  city: "city.webp", // distant tiled skyline behind buildings
  cityMapBackground: "mapBg.webp", // city map screen's own backdrop
  wallMaterial: "wallMaterial.webp", // exterior wall/floor-divider tile material
  coin: "coin.webp", // flat coin icon (HUD/menus)
  mouse: "mouse.webp", // free-boost critter
  officeChairsIcon: "isometricBox.webp", // office-chairs upgrade icon
  officeSuppliesIcon: "isometricYarn.webp", // office-supplies upgrade icon
  merge: "merge.webp", // Merge companies' own menu icon
  skyscraper: "skyscraper.webp", // Create new Company / Renovate floors icon
  cashRegister: "cashRegister.webp", // Trigger sales event's own menu icon
  clock: "clock.webp", // Work overtime's own menu icon
  slotsFrame: "slotsFrame.webp", // Jackpot Reels event's slot machine, windows cut out
} as const;
export type ImageName =
  | keyof typeof IMAGE_FILES
  | keyof typeof CRIT_IMAGE_FILES;

// the crit icons register themselves as the crits load (crits/critIcons), so
// this module stays out of the crit catalog and the boot can load it first
const imageFiles: Record<string, string> = { ...IMAGE_FILES };
export function registerImageFiles(files: Record<string, string>): void {
  Object.assign(imageFiles, files);
}

export function getRoofUrl(): string {
  return themeAssetUrl("roof.webp");
}

// the first screen's art, fetched and decoded while the game's code is still
// loading; each image's first loadImage takes it over
export function preloadFirstScreen(): void {
  [
    ...getBackgroundUrls(),
    getGroundUrl(),
    ...getCloudUrls(),
    getRoofUrl(),
    ...(Object.keys(SPRITE_FILES) as SpriteName[]).map(getSpriteUrl),
    ...(["city", "wallMaterial", "coin", "mouse"] as const).map(getImageUrl),
  ].forEach(loadImageEarly);
}

export function getBackgroundUrls(): string[] {
  return backgroundFiles.map(themeAssetUrl);
}

export function getGroundUrl(): string {
  return themeAssetUrl("street.webp");
}

export function getSpriteUrl(name: SpriteName): string {
  return themeAssetUrl(SPRITE_FILES[name]);
}

export function loadBackgrounds(): Promise<HTMLImageElement[]> {
  return Promise.all(getBackgroundUrls().map(loadImage));
}

export function loadGroundImage(): Promise<HTMLImageElement> {
  return loadImage(getGroundUrl());
}

export function loadSprite(name: SpriteName): Promise<HTMLImageElement> {
  return loadImage(getSpriteUrl(name));
}

export function getImageUrl(name: ImageName): string {
  const filename = imageFiles[name];
  return sharedThemeImages.has(filename)
    ? themeAssetUrl(filename)
    : critAssetUrl(filename);
}

// the white-bordered "sticker" cut of the same artwork, generated into
// public/stickers/ by scripts/add-sticker-borders.mjs — used by the Special
// Crits dialog, while the celebration flash draws the plain cut-out
export function getStickerUrl(name: ImageName): string {
  return `${PUBLIC_ASSET_BASE}stickers/${imageFiles[name]}`;
}

// flat black cut of the same sticker, shown for a crit the player hasn't
// discovered yet — its own file so an undiscovered crit never downloads the
// artwork it's hiding; two-colour art stays PNG, which beats WebP there
export function getSilhouetteUrl(name: ImageName): string {
  return `${PUBLIC_ASSET_BASE}silhouettes/${imageFiles[name].replace(/\.webp$/, ".png")}`;
}

export function loadImageByName(name: ImageName): Promise<HTMLImageElement> {
  return loadImage(getImageUrl(name));
}

export function getCloudUrls(): string[] {
  return cloudFiles.map(themeAssetUrl);
}

export function loadThemeClouds(): Promise<HTMLImageElement[]> {
  return Promise.all(getCloudUrls().map(loadImage));
}
