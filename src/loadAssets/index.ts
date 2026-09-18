import { loadImage } from "../utils";

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

// every flat single-file image this game loads, by logical name -> its filename
// inside dist/ root — same reasoning as SPRITE_FILES above
export const IMAGE_FILES = {
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
  dominoEffect: "dominoEffect.png", // Domino Effect crit flash's own backdrop icon
  blueprint: "blueprint.png", // Blueprint crit flash's own backdrop icon
  executiveBonus: "executiveBonus.png", // Executive Bonus crit flash's own backdrop icon
  powerSurge: "powerSurge.png", // Power Surge crit flash's own backdrop icon
  priceMatch: "priceMatch.png", // Price Match crit flash's own backdrop icon
  firstClass: "firstClass.png", // First Class crit flash's own backdrop icon
  ball: "ball.png", // Bounce crit flash's own backdrop icon
  explosion: "explosion.png", // Explosion crit flash's own backdrop icon
  booty: "booty.png", // Booty crit flash's own backdrop icon
  cashFlow: "cashFlow.png", // Cash Flow crit flash's own backdrop icon
  upgrade: "upgrade.png", // Upgrade crit flash's own backdrop icon
  peppermint: "peppermint.png", // Peppermint crit flash's own backdrop icon
  heaven: "heaven.png", // Heavenly crit flash's own backdrop icon
  skip: "skip.png", // Skip crit flash's own backdrop icon
  mystic: "mystic.png", // Mystic crit flash's own backdrop icon
  keynote: "keynote.png", // Keynote crit flash's own backdrop icon
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
  spendingFreeze: "spendingFreeze.png", // Spending Freeze crit flash's own backdrop icon
  snowball: "snowball.png", // Snowball crit flash's own backdrop icon
  bull: "bull.png", // Bull Market crit flash's own backdrop icon
  payday: "payday.png", // Payday crit flash's own backdrop icon
  goldStandard: "goldStandard.png", // Gold Standard crit flash's own backdrop icon
  sleepyMoon: "sleepyMoon.png", // Night Shift crit flash's own backdrop icon
  intern: "intern.png", // Intern crit flash's own backdrop icon
  talentScout: "talentScout.png", // Talent Scout crit flash's own backdrop icon
  unionBoss: "unionBoss.png", // Union Boss crit flash's own backdrop icon
  easterBunny: "easterBunny.png", // Easter Sale crit flash's own backdrop icon
  sportscar: "sportscar.png", // Rush Hour crit flash's own backdrop icon
  rateLock: "rateLock.png", // Rate Lock crit flash's own backdrop icon
  goldenTicket: "goldenTicket.png", // Golden Ticket crit flash's own backdrop icon
  silverTicket: "silverTicket.png", // Silver Ticket crit flash's own backdrop icon
  goldenParachute: "goldenParachute.png", // Golden Parachute crit flash's own backdrop icon
  rainCheck: "rainCheck.png", // Rain Check crit flash's own backdrop icon
  payout: "payout.png", // Payout crit flash's own backdrop icon
  grandOpening: "grandOpening.png", // Grand Opening crit flash's own backdrop icon
  fullyStaffed: "fullyStaffed.png", // Fully Staffed crit flash's own backdrop icon
  shiftChange: "shiftChange.png", // Shift Change crit flash's own backdrop icon
  espressoShot: "espressoShot.png", // Espresso Shot crit flash's own backdrop icon
  dejaVu: "dejaVu.png", // Deja Vu crit flash's own backdrop icon
  cloneArmy: "cloneArmy.png", // Reinforcements crit flash's own backdrop icon
  luckyClover: "luckyClover.png", // Lucky Clover crit flash's own backdrop icon
  secondWind: "secondWind.png", // Second Wind crit flash's own backdrop icon
  executiveOrder: "executiveOrder.png", // Executive Order crit flash's own backdrop icon
  roundUp: "roundUp.png", // Round Up crit flash's own backdrop icon
  safetyNet: "safetyNet.png", // Safety Net crit flash's own backdrop icon
  floorShare: "floorShare.png", // Floor Share crit flash's own backdrop icon
  sameBoat: "sameBoat.png", // Same Boat crit flash's own backdrop icon
  goldenHandshake: "goldenHandshake.png", // Golden Handshake crit flash's own backdrop icon
  supplyRun: "supplyRun.png", // Supply Run crit flash's own backdrop icon
  casualFriday: "casualFriday.png", // Casual Friday crit flash's own backdrop icon
  fancyFriday: "fancyFriday.png", // Fancy Friday crit flash's own backdrop icon
  fireDrill: "fireDrill.png", // Fire Drill crit flash's own backdrop icon
  bonusRound: "bonusRound.png", // Bonus Round crit flash's own backdrop icon
  overflow: "overflow.png", // Overflow crit flash's own backdrop icon
  performanceBonus: "performanceBonus.png", // Performance Bonus crit flash's own backdrop icon
  doubleDown: "doubleDown.png", // Double Down crit flash's own backdrop icon
  coffeeRun: "coffeeRun.png", // Coffee Run crit flash's own backdrop icon
  teamBuilding: "teamBuilding.png", // Team Building crit flash's own backdrop icon
  teamLunch: "teamLunch.png", // Team Lunch crit flash's own backdrop icon
  springCleaning: "springCleaning.png", // Spring Cleaning crit flash's own backdrop icon
  nightOwl: "nightOwl.png", // Night Owl crit flash's own backdrop icon
  headhunter: "headhunter.png", // Headhunter crit flash's own backdrop icon
  dressCode: "dressCode.png", // Dress Code crit flash's own backdrop icon
  teaBreak: "teaBreak.png", // Tea Break crit flash's own backdrop icon
  recruitmentDrive: "recruitmentDrive.png", // Recruitment Drive crit flash's own backdrop icon
  merger: "merger.png", // Merger crit flash's own backdrop icon
  shareholders: "sharedholders.png", // Shareholders crit flash's own backdrop icon
  luckyNumber: "luckyNumber.png", // Lucky Number crit flash's own backdrop icon
  openBook: "openBook.png", // Open Book crit flash's own backdrop icon
  ballerina: "ballerina.png",
  cowboy: "cowboy.png",
  dinnerTime: "dinnerTime.png",
  fingerGuns: "fingerGuns.png",
  flamenco: "flamenco.png",
  milestone: "milestone.png",
  moonwalker: "moonwalker.png",
  ninja: "ninja.png",
  obelisk: "obelisk.png",
  sharpShooter: "sharpShooter.png",
  space: "space.png",
  yesChef: "yesChef.png",
  amethyst: "amethyst.png",
  blessed: "blessed.png",
  centurion: "centurion.png",
  checkUp: "checkUp.png",
  diamond: "diamond.png",
  emerald: "emerald.png",
  fireman: "fireman.png",
  forTheEmperor: "forTheEmperor.png",
  forTheKing: "forTheKing.png",
  goldNugget: "goldNugget.png",
  goldRush: "goldRush.png",
  hammerTime: "hammerTime.png",
  robinHood: "robinHood.png",
  roman: "roman.png",
  ruby: "ruby.png",
  samurai: "samurai.png",
  saphire: "saphire.png",
  silverRush: "silverRush.png",
  spy: "spy.png",
  theLawWon: "theLawWon.png",
  victorian: "victorian.png",
  wizard: "wizard.png",
  executiveSpin: "executiveSpin.png",
  rubberStampede: "rubberStampede.png",
  replyAll: "replyAll.png",
  stapleOfSuccess: "stapleOfSuccess.png",
  faxOfFortune: "faxOfFortune.png",
  casualMonday: "casualMonday.png",
  deskJockey: "deskJockey.png",
  inboxZeroGravity: "inboxZeroGravity.png",
  beanCounter: "beanCounter.png",
  kingOfTheWorld: "kingOfTheWorld.png",
  officeClown: "officeClown.png",
  fridayTieDay: "fridayTieDay.png",
  soReady: "soReady.png",
  doughDivision: "doughDivision.png",
  profitPopcorn: "profitPopcorn.png",
  donutDisturb: "donutDisturb.png",
  cakeDay: "cakeDay.png",
  champagneProblems: "champagneProblems.png",
  bonusBurrito: "bonusBurrito.png",
  sundaeBest: "sundaeBest.png",
  popTheQuestion: "popTheQuestion.png",
  partyCrasher: "partyCrasher.png",
  epic: "epic.png",
  ready: "ready.png",
  workWork: "workWork.png",
  yesWarchief: "yesWarchief.png",
  youAreNotPrepared: "youAreNotPrepared.png",
  arcana: "arcana.png",
  bigDaddy: "bigDaddy.png",
  chonk: "chonk.png",
  cyberPunk: "cyberPunk.png",
  dodgeThis: "dodgeThis.png",
  whiteRabbit: "whiteRabbit.png",
  gladiator: "gladiator.png",
  iDidntAskForThis: "iDidntAskForThis.png",
  iHatePortals: "iHatePortals.png",
  littleSister: "littleSister.png",
  magicIsATool: "magicIsATool.png",
  megaChonk: "megaChonk.png",
  metal: "metal.png",
  princess: "princess.png",
  spaceAndTime: "spaceAndTime.png",
  thinkWithYourHead: "thinkWithYourHead.png",
  wouldYouKindly: "wouldYouKindly.png",
  yesYourHighness: "yesYourHighness.png",
  bulletDodger: "bulletDodger.png",
  nothingToSee: "nothingToSee.png",
  nowIAmSuspicious: "nowIAmSuspicious.png",
  redOrBlue: "redOrBlue.png",
  abraCashDabra: "abraCashDabra.png",
  captainOfIndustry: "captainOfIndustry.png",
  clowningAround: "clowningAround.png",
  discoDividend: "discoDividend.png",
  mimeYourBusiness: "mimeYourBusiness.png",
  redCarpetTreatment: "redCarpetTreatment.png",
  rockTheStock: "rockTheStock.png",
  strongReturn: "strongReturn.png",
  theBigCheese: "theBigCheese.png",
  queenOfQueens: "queenOfQueens.png",
  bubbleEconomy: "bubbleEconomy.png",
  cloudNineToFive: "cloudNineToFive.png",
  luckyLaundromat: "luckyLaundromat.png",
  moneyMagnet: "moneyMagnet.png",
  overTheRainbow: "overTheRainbow.png",
  pocketDimension: "pocketDimension.png",
  shootingStarEmployee: "shootingStarEmployee.png",
  treasureMeasure: "treasureMeasure.png",
  wishfulBanking: "wishfulBanking.png",
  backToTheFiscal: "backToTheFiscal.png",
  despicableFees: "despicableFees.png",
  howToTrainYourManager: "howToTrainYourManager.png",
  jurassicPerk: "jurassicPerk.png",
  raidersOfTheLostReceipt: "raidersOfTheLostReceipt.png",
  theDevilWearsPawda: "theDevilWearsPawda.png",
  theExpenseMatrix: "theExpenseMatrix.png",
  theFastAndTheFurriest: "theFastAndTheFurriest.png",
  theFellowshipOfTheBling: "theFellowshipOfTheBling.png",
  theGreatCatsby: "theGreatCatsby.png",
  theLordOfTheRingBinders: "theLordOfTheRingBinders.png",
  breakEven: "breakEven.png",
  chaChaChing: "chaChaChing.png",
  charlestonCharge: "charlestonCharge.png",
  congaCompounding: "congaCompounding.png",
  robotResources: "robotResources.png",
  rumbaReturns: "rumbaReturns.png",
  salsaSalary: "salsaSalary.png",
  shuffleTheFunds: "shuffleTheFunds.png",
  tangoTender: "tangoTender.png",
  tapThatAsset: "tapThatAsset.png",
  waltzStreet: "waltzStreet.png",
  prehistoric: "prehistoric.png",
  breadyOrNot: "breadyOrNot.png",
  eggcellentWork: "eggcellentWork.png",
  holyGuacamole: "holyGuacamole.png",
  loafActually: "loafActually.png",
  pastaLaVista: "pastaLaVista.png",
  souperStar: "souperStar.png",
  tacoBoutIt: "tacoBoutIt.png",
  theGreatPancakeStack: "theGreatPancakeStack.png",
  wokAndRoll: "wokAndRoll.png",
  iAmTheNight: "iAmTheNight.png",
  tubs: "tubs.png",
  whySoSerious: "whySoSerious.png",
  avocardio: "avocardio.png",
  butterBelieveIt: "butterBelieveIt.png",
  cheesePullChampion: "cheesePullChampion.png",
  grillSergeant: "grillSergeant.png",
  noodleNap: "noodleNap.png",
  picklePredicament: "picklePredicament.png",
  golem: "golem.png",
  hotPotato: "hotPotato.png",
  brunchBoss: "brunchBoss.png",
  curryFavour: "curryFavour.png",
  dimSumDynasty: "dimSumDynasty.png",
  soupDumplingSurgeon: "soupDumplingSurgeon.png",
  chocolateFountainOfYouth: "chocolateFountainOfYouth.png",
  gummyBearMarket: "gummyBearMarket.png",
  jawbreaker: "jawbreaker.png",
  licoriceLaces: "licoriceLaces.png",
  lollipopGuild: "lollipopGuild.png",
  marshmallowMountain: "marshmallowMountain.png",
  sugarHigh: "sugarHigh.png",
  bubblegumBalloon: "bubblegumBalloon.png",
  candyCaneClimber: "candyCaneClimber.png",
  sherbetSherpa: "sherbetSherpa.png",
  toffeeTrap: "toffeeTrap.png",
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

export function loadImageByName(name: ImageName): Promise<HTMLImageElement> {
  return loadImage(getImageUrl(name));
}

export function getCloudUrls(): string[] {
  return cloudFiles.map(themeAssetUrl);
}

export function loadThemeClouds(): Promise<HTMLImageElement[]> {
  return Promise.all(getCloudUrls().map(loadImage));
}
