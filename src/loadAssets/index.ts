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
  "city.png",
  "mapBg.png",
  "wallMaterial.png",
  "coin.png",
  "mouse.png",
  "isometricBox.png",
  "isometricYarn.png",
  "merge.png",
  "skyscraper.png",
  "cashRegister.png",
  "clock.png",
]);
const backgroundFiles = ["bg2.png", "bg4.png", "bg6.png"];
const cloudFiles = [
  "cloud0.png",
  "cloud1.png",
  "cloud2.png",
  "cloud3.png",
  "cloud4.png",
];

// Every sprite this game loads, by logical name -> its filename in public/assets/.
const SPRITE_FILES = {
  worker: "workerWalk.png",
  manager: "managerWalk.png",
  coinSpin: "coinSpin.png",
  cashBill: "cashBillFlutter.png",
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
  city: "city.png", // distant tiled skyline behind buildings
  cityMapBackground: "mapBg.png", // city map screen's own backdrop
  cloudCatIdle: "cloudCatIdle.png", // city map corner mascot, resting pose
  cloudCatHappy: "cloudCatHappy.png", // same mascot, cheering pose
  wallMaterial: "wallMaterial.png", // exterior wall/floor-divider tile material
  coin: "coin.png", // flat coin icon (HUD/menus)
  mouse: "mouse.png", // free-boost critter
  officeChairsIcon: "isometricBox.png", // office-chairs upgrade icon
  officeSuppliesIcon: "isometricYarn.png", // office-supplies upgrade icon
  merge: "merge.png", // Merge companies' own menu icon
  skyscraper: "skyscraper.png", // Create new Company / Renovate floors icon
  cashRegister: "cashRegister.png", // Trigger sales event's own menu icon
  clock: "clock.png", // Work overtime's own menu icon
  chain: "crits/classics/chain.png", // Chain crit flash's own backdrop icon
  dominoEffect: "crits/classics/dominoEffect.png", // Domino Effect crit flash's own backdrop icon
  blueprint: "crits/classics/blueprint.png", // Blueprint crit flash's own backdrop icon
  executiveBonus: "crits/riches/executiveBonus.png", // Executive Bonus crit flash's own backdrop icon
  powerSurge: "crits/classics/powerSurge.png", // Power Surge crit flash's own backdrop icon
  priceMatch: "crits/riches/priceMatch.png", // Price Match crit flash's own backdrop icon
  firstClass: "crits/classics/firstClass.png", // First Class crit flash's own backdrop icon
  ball: "crits/classics/ball.png", // Bounce crit flash's own backdrop icon
  explosion: "crits/classics/explosion.png", // Explosion crit flash's own backdrop icon
  booty: "crits/riches/booty.png", // Booty crit flash's own backdrop icon
  cashFlow: "crits/riches/cashFlow.png", // Cash Flow crit flash's own backdrop icon
  upgrade: "crits/classics/upgrade.png", // Upgrade crit flash's own backdrop icon
  peppermint: "crits/classics/peppermint.png", // Peppermint crit flash's own backdrop icon
  heaven: "crits/classics/heaven.png", // Heavenly crit flash's own backdrop icon
  skip: "crits/classics/skip.png", // Skip crit flash's own backdrop icon
  mystic: "crits/classics/mystic.png", // Mystic crit flash's own backdrop icon
  keynote: "crits/office/keynote.png", // Keynote crit flash's own backdrop icon
  pair: "crits/gamesOfChance/pair.png", // Pair crit flash's own backdrop icon
  threeOfAKind: "crits/gamesOfChance/threeOfAKind.png", // Three of a Kind crit flash's own backdrop icon
  fourOfAKind: "crits/gamesOfChance/fourOfAKind.png", // Four of a Kind crit flash's own backdrop icon
  fullHouse: "crits/gamesOfChance/fullHouse.png", // Full House crit flash's own backdrop icon
  royalFlush: "crits/gamesOfChance/royalFlush.png", // Royal Flush crit flash's own backdrop icon
  winter: "crits/seasons/christmasTree.png", // Winter Sale crit flash's own backdrop icon
  spring: "crits/seasons/spring.png", // Spring Sale crit flash's own backdrop icon
  summer: "crits/seasons/summer.png", // Summer Sale crit flash's own backdrop icon
  autumn: "crits/seasons/fall.png", // Autumn Sale crit flash's own backdrop icon
  halloween: "crits/seasons/halloween.png", // Halloween Sale crit flash's own backdrop icon
  sunny: "crits/seasons/sunny.png", // Sunshine crit flash's own backdrop icon
  snowman: "crits/seasons/snowman.png", // Snowday crit flash's own backdrop icon
  fastforward: "crits/classics/fastforward.png", // Fast Forward crit flash's own backdrop icon
  icecube: "crits/seasons/icecube.png", // Frozen crit flash's own backdrop icon
  spendingFreeze: "crits/seasons/spendingFreeze.png", // Spending Freeze crit flash's own backdrop icon
  snowball: "crits/seasons/snowball.png", // Snowball crit flash's own backdrop icon
  bull: "crits/riches/bull.png", // Bull Market crit flash's own backdrop icon
  payday: "crits/riches/payday.png", // Payday crit flash's own backdrop icon
  goldStandard: "crits/riches/goldStandard.png", // Gold Standard crit flash's own backdrop icon
  sleepyMoon: "crits/seasons/sleepyMoon.png", // Night Shift crit flash's own backdrop icon
  intern: "crits/office/intern.png", // Intern crit flash's own backdrop icon
  talentScout: "crits/office/talentScout.png", // Talent Scout crit flash's own backdrop icon
  unionBoss: "crits/office/unionBoss.png", // Union Boss crit flash's own backdrop icon
  easterBunny: "crits/seasons/easterBunny.png", // Easter Sale crit flash's own backdrop icon
  sportscar: "crits/classics/sportscar.png", // Rush Hour crit flash's own backdrop icon
  rateLock: "crits/riches/rateLock.png", // Rate Lock crit flash's own backdrop icon
  goldenTicket: "crits/goodLuck/goldenTicket.png", // Golden Ticket crit flash's own backdrop icon
  silverTicket: "crits/goodLuck/silverTicket.png", // Silver Ticket crit flash's own backdrop icon
  goldenParachute: "crits/riches/goldenParachute.png", // Golden Parachute crit flash's own backdrop icon
  rainCheck: "crits/office/rainCheck.png", // Rain Check crit flash's own backdrop icon
  payout: "crits/riches/payout.png", // Payout crit flash's own backdrop icon
  grandOpening: "crits/office/grandOpening.png", // Grand Opening crit flash's own backdrop icon
  fullyStaffed: "crits/office/fullyStaffed.png", // Fully Staffed crit flash's own backdrop icon
  shiftChange: "crits/office/shiftChange.png", // Shift Change crit flash's own backdrop icon
  espressoShot: "crits/office/espressoShot.png", // Espresso Shot crit flash's own backdrop icon
  dejaVu: "crits/classics/dejaVu.png", // Deja Vu crit flash's own backdrop icon
  cloneArmy: "crits/office/cloneArmy.png", // Reinforcements crit flash's own backdrop icon
  luckyClover: "crits/goodLuck/luckyClover.png", // Lucky Clover crit flash's own backdrop icon
  secondWind: "crits/office/secondWind.png", // Second Wind crit flash's own backdrop icon
  executiveOrder: "crits/office/executiveOrder.png", // Executive Order crit flash's own backdrop icon
  roundUp: "crits/office/roundUp.png", // Round Up crit flash's own backdrop icon
  safetyNet: "crits/office/safetyNet.png", // Safety Net crit flash's own backdrop icon
  floorShare: "crits/office/floorShare.png", // Floor Share crit flash's own backdrop icon
  sameBoat: "crits/office/sameBoat.png", // Same Boat crit flash's own backdrop icon
  goldenHandshake: "crits/riches/goldenHandshake.png", // Golden Handshake crit flash's own backdrop icon
  supplyRun: "crits/office/supplyRun.png", // Supply Run crit flash's own backdrop icon
  casualFriday: "crits/office/casualFriday.png", // Casual Friday crit flash's own backdrop icon
  fancyFriday: "crits/office/fancyFriday.png", // Fancy Friday crit flash's own backdrop icon
  fireDrill: "crits/office/fireDrill.png", // Fire Drill crit flash's own backdrop icon
  bonusRound: "crits/gamesOfChance/bonusRound.png", // Bonus Round crit flash's own backdrop icon
  overflow: "crits/riches/overflow.png", // Overflow crit flash's own backdrop icon
  performanceBonus: "crits/riches/performanceBonus.png", // Performance Bonus crit flash's own backdrop icon
  doubleDown: "crits/gamesOfChance/doubleDown.png", // Double Down crit flash's own backdrop icon
  coffeeRun: "crits/office/coffeeRun.png", // Coffee Run crit flash's own backdrop icon
  teamBuilding: "crits/office/teamBuilding.png", // Team Building crit flash's own backdrop icon
  teamLunch: "crits/office/teamLunch.png", // Team Lunch crit flash's own backdrop icon
  springCleaning: "crits/office/springCleaning.png", // Spring Cleaning crit flash's own backdrop icon
  nightOwl: "crits/seasons/nightOwl.png", // Night Owl crit flash's own backdrop icon
  headhunter: "crits/office/headhunter.png", // Headhunter crit flash's own backdrop icon
  dressCode: "crits/office/dressCode.png", // Dress Code crit flash's own backdrop icon
  teaBreak: "crits/office/teaBreak.png", // Tea Break crit flash's own backdrop icon
  recruitmentDrive: "crits/office/recruitmentDrive.png", // Recruitment Drive crit flash's own backdrop icon
  merger: "crits/riches/merger.png", // Merger crit flash's own backdrop icon
  shareholders: "crits/riches/sharedholders.png", // Shareholders crit flash's own backdrop icon
  luckyNumber: "crits/gamesOfChance/luckyNumber.png", // Lucky Number crit flash's own backdrop icon
  openBook: "crits/office/openBook.png", // Open Book crit flash's own backdrop icon
} as const;
export type ImageName = keyof typeof IMAGE_FILES;

export function getBackgroundUrls(): string[] {
  return backgroundFiles.map(themeAssetUrl);
}

export function getGroundUrl(): string {
  return themeAssetUrl("street.png");
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
// artwork it's hiding
export function getSilhouetteUrl(name: ImageName): string {
  return `${PUBLIC_ASSET_BASE}silhouettes/${IMAGE_FILES[name]}`;
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
