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
  merge: "merge.png", // Merge companies' own menu icon
  skyscraper: "skyscraper.png", // Create new Company / Renovate floors icon
  cashRegister: "cashRegister.png", // Trigger sales event's own menu icon
  clock: "clock.png", // Work overtime's own menu icon
  chain: "chain.png", // Chain crit flash's own backdrop icon
  ball: "ball.png", // Bounce crit flash's own backdrop icon
  explosion: "explosion.png", // Explosion crit flash's own backdrop icon
  booty: "booty.png", // Booty crit flash's own backdrop icon
  upgrade: "upgrade.png", // Upgrade crit flash's own backdrop icon
  peppermint: "peppermint.png", // Peppermint crit flash's own backdrop icon
  heaven: "heaven.png", // Heavenly crit flash's own backdrop icon
  pair: "pair.png", // Pair crit flash's own backdrop icon
  threeOfAKind: "threeOfAKind.png", // Three of a Kind crit flash's own backdrop icon
  fourOfAKind: "fourOfAKind.png", // Four of a Kind crit flash's own backdrop icon
  fullHouse: "fullHouse.png", // Full House crit flash's own backdrop icon
  royalFlush: "royalFlush.png", // Royal Flush crit flash's own backdrop icon
  winter: "christmasTree.png", // Winter Sale crit flash's own backdrop icon
  spring: "spring.png", // Spring Sale crit flash's own backdrop icon
  summer: "summer.png", // Summer Sale crit flash's own backdrop icon
  autumn: "fall.png", // Autumn Sale crit flash's own backdrop icon
  halloween: "halloween.png", // Halloween Sale crit flash's own backdrop icon
  sunny: "sunny.png", // Sunshine crit flash's own backdrop icon
  snowman: "snowman.png", // Snowday crit flash's own backdrop icon
  fastforward: "fastforward.png", // Fast Forward crit flash's own backdrop icon
  icecube: "icecube.png", // Frozen crit flash's own backdrop icon
  snowball: "snowball.png", // Snowball crit flash's own backdrop icon
  bull: "bull.png", // Bull Market crit flash's own backdrop icon
  payday: "payday.png", // Payday crit flash's own backdrop icon
  goldStandard: "goldStandard.png", // Gold Standard crit flash's own backdrop icon
  sleepyMoon: "sleepyMoon.png", // Night Shift crit flash's own backdrop icon
  intern: "intern.png", // Intern crit flash's own backdrop icon
  unionBoss: "unionBoss.png", // Union Boss crit flash's own backdrop icon
  easterBunny: "easterBunny.png", // Easter Sale crit flash's own backdrop icon
  sportscar: "sportscar.png", // Rush Hour crit flash's own backdrop icon
  goldenTicket: "goldenTicket.png", // Golden Ticket crit flash's own backdrop icon
  silverTicket: "silverTicket.png", // Silver Ticket crit flash's own backdrop icon
  goldenParachute: "goldenParachute.png", // Golden Parachute crit flash's own backdrop icon
  payout: "payout.png", // Payout crit flash's own backdrop icon
  grandOpening: "grandOpening.png", // Grand Opening crit flash's own backdrop icon
  fullyStaffed: "fullyStaffed.png", // Fully Staffed crit flash's own backdrop icon
  espressoShot: "espressoShot.png", // Espresso Shot crit flash's own backdrop icon
  dejaVu: "dejaVu.png", // Deja Vu crit flash's own backdrop icon
  cloneArmy: "cloneArmy.png", // Clone Army crit flash's own backdrop icon
  luckyClover: "luckyClover.png", // Lucky Clover crit flash's own backdrop icon
  secondWind: "secondWind.png", // Second Wind crit flash's own backdrop icon
  executiveOrder: "executiveOrder.png", // Executive Order crit flash's own backdrop icon
  roundUp: "roundUp.png", // Round Up crit flash's own backdrop icon
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
