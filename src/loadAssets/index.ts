import { loadImage } from "../utils";

// every generated asset lives under this one folder (see docs/prompts.md for how
// the raw art was authored, and scripts/process-*.mjs for how it's built). This
// used to glob across multiple theme folders and pick one at runtime; that whole
// multi-theme system was removed, so these just always point at "references".
const backgroundModules = import.meta.glob<string>(
  "../assets/themes/references/dist/backgrounds/*.png",
  { eager: true, import: "default" },
);
const groundModules = import.meta.glob<string>(
  "../assets/themes/references/dist/ground/street.png",
  { eager: true, import: "default" },
);
const spriteModules = import.meta.glob<string>(
  "../assets/themes/references/dist/sprites/*.png",
  { eager: true, import: "default" },
);
// flat single-file images living directly in dist/ root (icons, backdrops,
// textures — anything that isn't a multi-file set like backgrounds/sprites/
// clouds above)
const imageModules = import.meta.glob<string>(
  "../assets/themes/references/dist/*.png",
  { eager: true, import: "default" },
);
const cloudModules = import.meta.glob<string>(
  "../assets/themes/references/dist/clouds/*.png",
  { eager: true, import: "default" },
);

// every sprite this game loads, by logical name -> its filename inside dist/sprites/
const SPRITE_FILES = {
  worker: "workerWalk.png",
  manager: "managerWalk.png",
  coinSpin: "coinSpin.png",
  cashBill: "cashBillFlutter.png",
  podium: "podiumSpeak.png",
} as const;
export type SpriteName = keyof typeof SPRITE_FILES;

// every flat single-file image this game loads, by logical name -> its filename
// inside dist/ root — same reasoning as SPRITE_FILES above
const IMAGE_FILES = {
  city: "city.png", // distant tiled skyline behind buildings
  cityMapBackground: "mapBg.png", // city map screen's own backdrop
  wallMaterial: "wallMaterial.png", // exterior wall/floor-divider tile material
  coin: "coin.png", // flat coin icon (HUD/menus)
  mouse: "mouse.png", // free-boost critter
  officeChairsIcon: "isometricBox.png", // office-chairs upgrade icon
  officeSuppliesIcon: "isometricYarn.png", // office-supplies upgrade icon
  audience: "audience.png", // press conference audience backdrop
} as const;
export type ImageName = keyof typeof IMAGE_FILES;

export function getBackgroundUrls(): string[] {
  const urls = Object.keys(backgroundModules)
    .sort()
    .map((path) => backgroundModules[path]);
  if (urls.length === 0) {
    throw new Error("No floor backgrounds generated");
  }
  return urls;
}

export function getGroundUrl(): string {
  const path = Object.keys(groundModules)[0];
  if (!path) {
    throw new Error("No ground/street art generated");
  }
  return groundModules[path];
}

export function getSpriteUrl(name: SpriteName): string {
  const filename = SPRITE_FILES[name];
  const path = Object.keys(spriteModules).find((p) =>
    p.endsWith(`/${filename}`),
  );
  if (!path) {
    throw new Error(`Missing sprite "${filename}"`);
  }
  return spriteModules[path];
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
  const filename = IMAGE_FILES[name];
  const path = Object.keys(imageModules).find((p) =>
    p.endsWith(`/${filename}`),
  );
  if (!path) {
    throw new Error(`Missing image "${filename}"`);
  }
  return imageModules[path];
}

export function loadImageByName(name: ImageName): Promise<HTMLImageElement> {
  return loadImage(getImageUrl(name));
}

export function getCloudUrls(): string[] {
  const urls = Object.keys(cloudModules)
    .sort()
    .map((path) => cloudModules[path]);
  if (urls.length === 0) {
    throw new Error("No clouds generated");
  }
  return urls;
}

export function loadThemeClouds(): Promise<HTMLImageElement[]> {
  return Promise.all(getCloudUrls().map(loadImage));
}
