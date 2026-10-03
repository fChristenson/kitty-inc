import { loadImage } from "../utils";
import {
  FEATURED_CRITS,
  FEATURED_CRIT_KINDS,
  type FeaturedCritKind,
} from "../shared/critTypes";

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

// every featured crit's icon, keyed by the crit's own kind
const FEATURED_CRIT_IMAGE_FILES = Object.fromEntries(
  FEATURED_CRIT_KINDS.map((kind) => [kind, FEATURED_CRITS[kind].image]),
) as Record<FeaturedCritKind, string>;

// every flat single-file image this game loads, by logical name -> its filename
// inside dist/ root — same reasoning as SPRITE_FILES above
export const IMAGE_FILES = {
  ...FEATURED_CRIT_IMAGE_FILES,
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
  chain: "crits/classics/chain.webp", // Chain crit flash's own backdrop icon
  dominoEffect: "crits/classics/dominoEffect.webp", // Domino Effect crit flash's own backdrop icon
  blueprint: "crits/classics/blueprint.webp", // Blueprint crit flash's own backdrop icon
  executiveBonus: "crits/riches/executiveBonus.webp", // Executive Bonus crit flash's own backdrop icon
  powerSurge: "crits/classics/powerSurge.webp", // Power Surge crit flash's own backdrop icon
  priceMatch: "crits/riches/priceMatch.webp", // Price Match crit flash's own backdrop icon
  firstClass: "crits/classics/firstClass.webp", // First Class crit flash's own backdrop icon
  ball: "crits/classics/ball.webp", // Bounce crit flash's own backdrop icon
  explosion: "crits/classics/explosion.webp", // Explosion crit flash's own backdrop icon
  booty: "crits/riches/booty.webp", // Booty crit flash's own backdrop icon
  cashFlow: "crits/riches/cashFlow.webp", // Cash Flow crit flash's own backdrop icon
  upgrade: "crits/classics/upgrade.webp", // Upgrade crit flash's own backdrop icon
  peppermint: "crits/classics/peppermint.webp", // Peppermint crit flash's own backdrop icon
  heaven: "crits/classics/heaven.webp", // Heavenly crit flash's own backdrop icon
  skip: "crits/classics/skip.webp", // Skip crit flash's own backdrop icon
  mystic: "crits/classics/mystic.webp", // Mystic crit flash's own backdrop icon
  keynote: "crits/office/keynote.webp", // Keynote crit flash's own backdrop icon
  pair: "crits/gamesOfChance/pair.webp", // Pair crit flash's own backdrop icon
  threeOfAKind: "crits/gamesOfChance/threeOfAKind.webp", // Three of a Kind crit flash's own backdrop icon
  fourOfAKind: "crits/gamesOfChance/fourOfAKind.webp", // Four of a Kind crit flash's own backdrop icon
  fullHouse: "crits/gamesOfChance/fullHouse.webp", // Full House crit flash's own backdrop icon
  royalFlush: "crits/gamesOfChance/royalFlush.webp", // Royal Flush crit flash's own backdrop icon
  winter: "crits/seasons/christmasTree.webp", // Winter Sale crit flash's own backdrop icon
  spring: "crits/seasons/spring.webp", // Spring Sale crit flash's own backdrop icon
  summer: "crits/seasons/summer.webp", // Summer Sale crit flash's own backdrop icon
  autumn: "crits/seasons/fall.webp", // Autumn Sale crit flash's own backdrop icon
  halloween: "crits/seasons/halloween.webp", // Halloween Sale crit flash's own backdrop icon
  sunny: "crits/seasons/sunny.webp", // Sunshine crit flash's own backdrop icon
  snowman: "crits/seasons/snowman.webp", // Snowday crit flash's own backdrop icon
  fastforward: "crits/classics/fastforward.webp", // Fast Forward crit flash's own backdrop icon
  icecube: "crits/seasons/icecube.webp", // Frozen crit flash's own backdrop icon
  spendingFreeze: "crits/seasons/spendingFreeze.webp", // Spending Freeze crit flash's own backdrop icon
  snowball: "crits/seasons/snowball.webp", // Snowball crit flash's own backdrop icon
  bull: "crits/riches/bull.webp", // Bull Market crit flash's own backdrop icon
  payday: "crits/riches/payday.webp", // Payday crit flash's own backdrop icon
  goldStandard: "crits/riches/goldStandard.webp", // Gold Standard crit flash's own backdrop icon
  sleepyMoon: "crits/seasons/sleepyMoon.webp", // Night Shift crit flash's own backdrop icon
  intern: "crits/office/intern.webp", // Intern crit flash's own backdrop icon
  talentScout: "crits/office/talentScout.webp", // Talent Scout crit flash's own backdrop icon
  unionBoss: "crits/office/unionBoss.webp", // Union Boss crit flash's own backdrop icon
  easterBunny: "crits/seasons/easterBunny.webp", // Easter Sale crit flash's own backdrop icon
  sportscar: "crits/classics/sportscar.webp", // Rush Hour crit flash's own backdrop icon
  rateLock: "crits/riches/rateLock.webp", // Rate Lock crit flash's own backdrop icon
  goldenTicket: "crits/goodLuck/goldenTicket.webp", // Golden Ticket crit flash's own backdrop icon
  silverTicket: "crits/goodLuck/silverTicket.webp", // Silver Ticket crit flash's own backdrop icon
  goldenParachute: "crits/riches/goldenParachute.webp", // Golden Parachute crit flash's own backdrop icon
  rainCheck: "crits/office/rainCheck.webp", // Rain Check crit flash's own backdrop icon
  payout: "crits/riches/payout.webp", // Payout crit flash's own backdrop icon
  grandOpening: "crits/office/grandOpening.webp", // Grand Opening crit flash's own backdrop icon
  fullyStaffed: "crits/office/fullyStaffed.webp", // Fully Staffed crit flash's own backdrop icon
  shiftChange: "crits/office/shiftChange.webp", // Shift Change crit flash's own backdrop icon
  espressoShot: "crits/office/espressoShot.webp", // Espresso Shot crit flash's own backdrop icon
  dejaVu: "crits/classics/dejaVu.webp", // Deja Vu crit flash's own backdrop icon
  cloneArmy: "crits/office/cloneArmy.webp", // Reinforcements crit flash's own backdrop icon
  luckyClover: "crits/goodLuck/luckyClover.webp", // Lucky Clover crit flash's own backdrop icon
  secondWind: "crits/office/secondWind.webp", // Second Wind crit flash's own backdrop icon
  executiveOrder: "crits/office/executiveOrder.webp", // Executive Order crit flash's own backdrop icon
  roundUp: "crits/office/roundUp.webp", // Round Up crit flash's own backdrop icon
  safetyNet: "crits/office/safetyNet.webp", // Safety Net crit flash's own backdrop icon
  floorShare: "crits/office/floorShare.webp", // Floor Share crit flash's own backdrop icon
  sameBoat: "crits/office/sameBoat.webp", // Same Boat crit flash's own backdrop icon
  goldenHandshake: "crits/riches/goldenHandshake.webp", // Golden Handshake crit flash's own backdrop icon
  supplyRun: "crits/office/supplyRun.webp", // Supply Run crit flash's own backdrop icon
  casualFriday: "crits/office/casualFriday.webp", // Casual Friday crit flash's own backdrop icon
  fancyFriday: "crits/office/fancyFriday.webp", // Fancy Friday crit flash's own backdrop icon
  fireDrill: "crits/office/fireDrill.webp", // Fire Drill crit flash's own backdrop icon
  bonusRound: "crits/gamesOfChance/bonusRound.webp", // Bonus Round crit flash's own backdrop icon
  overflow: "crits/riches/overflow.webp", // Overflow crit flash's own backdrop icon
  performanceBonus: "crits/riches/performanceBonus.webp", // Performance Bonus crit flash's own backdrop icon
  doubleDown: "crits/gamesOfChance/doubleDown.webp", // Double Down crit flash's own backdrop icon
  coffeeRun: "crits/office/coffeeRun.webp", // Coffee Run crit flash's own backdrop icon
  teamBuilding: "crits/office/teamBuilding.webp", // Team Building crit flash's own backdrop icon
  teamLunch: "crits/office/teamLunch.webp", // Team Lunch crit flash's own backdrop icon
  springCleaning: "crits/office/springCleaning.webp", // Spring Cleaning crit flash's own backdrop icon
  nightOwl: "crits/seasons/nightOwl.webp", // Night Owl crit flash's own backdrop icon
  headhunter: "crits/office/headhunter.webp", // Headhunter crit flash's own backdrop icon
  dressCode: "crits/office/dressCode.webp", // Dress Code crit flash's own backdrop icon
  teaBreak: "crits/office/teaBreak.webp", // Tea Break crit flash's own backdrop icon
  recruitmentDrive: "crits/office/recruitmentDrive.webp", // Recruitment Drive crit flash's own backdrop icon
  merger: "crits/riches/merger.webp", // Merger crit flash's own backdrop icon
  shareholders: "crits/riches/sharedholders.webp", // Shareholders crit flash's own backdrop icon
  luckyNumber: "crits/gamesOfChance/luckyNumber.webp", // Lucky Number crit flash's own backdrop icon
  openBook: "crits/office/openBook.webp", // Open Book crit flash's own backdrop icon
} as const;
export type ImageName = keyof typeof IMAGE_FILES;

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
  const filename = IMAGE_FILES[name];
  return sharedThemeImages.has(filename)
    ? themeAssetUrl(filename)
    : critAssetUrl(filename);
}

// the white-bordered "sticker" cut of the same artwork, generated into
// public/stickers/ by scripts/add-sticker-borders.mjs — used by the Special
// Crits dialog, while the celebration flash draws the plain cut-out
export function getStickerUrl(name: ImageName): string {
  return `${PUBLIC_ASSET_BASE}stickers/${IMAGE_FILES[name]}`;
}

// flat black cut of the same sticker, shown for a crit the player hasn't
// discovered yet — its own file so an undiscovered crit never downloads the
// artwork it's hiding; two-colour art stays PNG, which beats WebP there
export function getSilhouetteUrl(name: ImageName): string {
  return `${PUBLIC_ASSET_BASE}silhouettes/${IMAGE_FILES[name].replace(/\.webp$/, ".png")}`;
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
