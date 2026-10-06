import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const HEROES_CRITS = {
  blessed: {
    label: "Blessed",
    color: COLOR.heavenlyGold,
    image: "crits/heroes/blessed.webp",
    description: "One tier promotion and three upgrades here",
  },
  centurion: {
    label: "Centurion",
    color: COLOR.red,
    image: "crits/heroes/centurion.webp",
    description: "Boosts every worker for 15s",
  },
  checkUp: {
    label: "Check Up",
    color: COLOR.cyan,
    image: "crits/heroes/checkUp.webp",
    description: "Four upgrades and two payouts on the lowest-level floor",
  },
  fireman: {
    label: "First Responder",
    color: COLOR.orange,
    image: "crits/heroes/fireman.webp",
    description: "Three upgrades, then one payout on every floor",
  },
  forTheEmperor: {
    label: "For the Emperor",
    color: COLOR.blue,
    image: "crits/heroes/forTheEmperor.webp",
    description: "Twenty-five upgrades on every unlocked floor",
  },
  forTheKing: {
    label: "For the King",
    color: COLOR.starYellow,
    image: "crits/heroes/forTheKing.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  hammerTime: {
    label: "Hammer Time",
    color: COLOR.red,
    image: "crits/heroes/hammerTime.webp",
    description: "Free office chairs for this floor",
  },
  robinHood: {
    label: "Honor among thieves",
    color: COLOR.moneyGreen,
    image: "crits/heroes/robinHood.webp",
    description: "Free office supplies for this floor",
  },
  roman: {
    label: "Roman Holiday",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/roman.webp",
    description: "Boosts this floor's workers for 22s",
  },
  samurai: {
    label: "Samurai",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/samurai.webp",
    description: "Cuts every price in this building by 1.4%",
  },
  spy: {
    label: "Undercover",
    color: COLOR.nightShiftIndigo,
    image: "crits/heroes/spy.webp",
    description: "Boosts this floor's workers for 23s",
  },
  theLawWon: {
    label: "The Law Won",
    color: COLOR.blue,
    image: "crits/heroes/theLawWon.webp",
    description: "Cuts every price in this building by 1%",
  },
  victorian: {
    label: "High Society",
    color: COLOR.gold,
    image: "crits/heroes/victorian.webp",
    description: "Boosts this floor's workers for 22s",
  },
  uchihaItachi: {
    label: "Big brother",
    color: COLOR.doubleDownCrimson,
    image: "crits/heroes/uchihaItachi.webp",
    description: "Grows this floor's level by 12.1% in free upgrades",
  },
  geralt: {
    label: "Butcher of Blaviken",
    color: COLOR.easterSalePink,
    image: "crits/heroes/geralt.webp",
    description: "Grows this floor's level by 12.8% in free upgrades",
  },
  purrfectOrigin: {
    label: "Purrfect Origin",
    color: COLOR.sunshineGold,
    image: "crits/heroes/purrfectOrigin.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  capeEscape: {
    label: "Cape Escape",
    color: COLOR.red,
    image: "crits/heroes/capeEscape.webp",
    description: "Cuts every price in this building by 1.3%",
  },
  thunderPaws: {
    label: "Thunder Paws",
    color: COLOR.blue,
    image: "crits/heroes/thunderPaws.webp",
    description: "Boosts this floor's workers for 23s",
  },
  clawAndOrder: {
    label: "Claw and Order",
    color: COLOR.cyan,
    image: "crits/heroes/clawAndOrder.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  felineFury: {
    label: "Feline Fury",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/felineFury.webp",
    description: "Sixteen free upgrades on this floor",
  },
  sidekickShuffle: {
    label: "Sidekick Shuffle",
    color: COLOR.peppermintPink,
    image: "crits/heroes/sidekickShuffle.webp",
    description: "Hires 1 free worker on this floor",
  },
  cosmicCatapult: {
    label: "Cosmic Catapult",
    color: COLOR.nightShiftIndigo,
    image: "crits/heroes/cosmicCatapult.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  iAmTheNight: {
    label: "I Am the Night",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/heroes/iAmTheNight.webp",
    description: "Hires 1 free worker on this floor",
  },
  tubs: {
    label: "Tubs",
    color: COLOR.rainCheckBlue,
    image: "crits/heroes/tubs.webp",
    description: "Twenty-six instant payouts on this floor",
  },
  whySoSerious: {
    label: "Why So Serious",
    color: COLOR.halloweenSalePurple,
    image: "crits/heroes/whySoSerious.webp",
    description: "Two tier promotions and twenty upgrades here",
  },
  batman: {
    label: "The Dark Knight",
    color: COLOR.black,
    image: "crits/heroes/batman.webp",
    description:
      "Repeats the crit on the floor above, 53% chance to keep climbing",
  },
  joker: {
    label: "Joker's Wild",
    color: COLOR.purple,
    image: "crits/heroes/joker.webp",
    description: "Unlocks the next floor for free",
  },
  harleyQuinn: {
    label: "Quinn's Whirlwind",
    color: COLOR.springSalePink,
    image: "crits/heroes/harleyQuinn.webp",
    description:
      "Repeats the crit on the floor above, 36% chance to keep climbing",
  },
  killerCroc: {
    label: "Crocodile Cash",
    color: COLOR.luckyCloverGreen,
    image: "crits/heroes/killerCroc.webp",
    description: "Adds 23.7% of your total income",
  },
  mrFreeze: {
    label: "Cryo Lock",
    color: COLOR.blue,
    image: "crits/heroes/mrFreeze.webp",
    description: "Unlocks the next floor for free",
  },
  poisonIvy: {
    label: "Verdant Fortune",
    color: COLOR.luckyCloverGreen,
    image: "crits/heroes/poisonIvy.webp",
    description: "Adds 10.6% of your total income",
  },
  scarecrow: {
    label: "Fear Harvest",
    color: COLOR.teaBreakBrown,
    image: "crits/heroes/scarecrow.webp",
    description: "Thirty free upgrades on this floor",
  },
  thePenguin: {
    label: "Iceberg Payday",
    color: COLOR.blue,
    image: "crits/heroes/thePenguin.webp",
    description: "Adds 14s of your company's income",
  },
  theRiddler: {
    label: "Puzzle Box",
    color: COLOR.luckyCloverGreen,
    image: "crits/heroes/theRiddler.webp",
    description: "Free office chairs and supplies for this floor",
  },
  bane: {
    label: "Breaking Point",
    color: COLOR.red,
    image: "crits/heroes/bane.webp",
    description: "Forty-two free upgrades on this floor",
  },
  harleyQuinn2: {
    label: "Harley Quinn's Encore",
    color: COLOR.springSalePink,
    image: "crits/heroes/harleyQuinn2.webp",
    description: "Locks every floor's upgrade price for 5s",
  },
  killerCroc2: {
    label: "Croc Rampage",
    color: COLOR.luckyCloverGreen,
    image: "crits/heroes/killerCroc2.webp",
    description: "Boosts every worker for 31s",
  },
  poisonIvy2: {
    label: "Ivy's Garden",
    color: COLOR.luckyCloverGreen,
    image: "crits/heroes/poisonIvy2.webp",
    description: "Thirty-one free upgrades on this floor",
  },
  poisonIvy3: {
    label: "Venomous Bloom",
    color: COLOR.luckyCloverGreen,
    image: "crits/heroes/poisonIvy3.webp",
    description: "Thirty-seven instant payouts on every unlocked floor",
  },
  thePenguin2: {
    label: "Penguin's Payday",
    color: COLOR.blue,
    image: "crits/heroes/thePenguin2.webp",
    description: "Adds 7.2% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
