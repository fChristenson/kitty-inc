import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const LUCKY_CATS_CRITS = {
  purrfectUnit: {
    label: "Purrfect Unit",
    color: COLOR.fullHouseCrimson,
    image: "crits/luckyCats/purrfectUnit.webp",
    description: "Seventeen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.purrfectUnitUpgrades),
  },
  bigIsBeautiful: {
    label: "Big Is Beautiful",
    color: COLOR.fullHouseCrimson,
    image: "crits/luckyCats/bigIsBeautiful.webp",
    description: "Adds 81s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.bigIsBeautifulSeconds),
  },
  cleanItUp: {
    label: "Clean It Up",
    color: COLOR.amber,
    image: "crits/luckyCats/cleanItUp.webp",
    description: "Ninety-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.cleanItUpPayouts),
  },
  fabulousChonk: {
    label: "Fabulous Chonk",
    color: COLOR.grandOpeningRose,
    image: "crits/luckyCats/fabulousChonk.webp",
    description: "Adds 82s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.fabulousChonkSeconds),
  },
  helloThere: {
    label: "Hello There",
    color: COLOR.amberMuted,
    image: "crits/luckyCats/helloThere.webp",
    description: "One hundred instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.helloTherePayouts),
  },
  honeyPlease: {
    label: "Honey Please",
    color: COLOR.disabledGray,
    image: "crits/luckyCats/honeyPlease.webp",
    description: "One hundred and one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.honeyPleasePayouts),
  },
  iCanHas: {
    label: "I Can Has",
    color: COLOR.orange,
    image: "crits/luckyCats/iCanHas.webp",
    description: "Adds 84s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.iCanHasSeconds),
  },
  intenseWorkout: {
    label: "Intense Workout",
    color: COLOR.summerSaleOrange,
    image: "crits/luckyCats/intenseWorkout.webp",
    description: "Twenty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.intenseWorkoutUpgrades),
  },
  loveMe: {
    label: "Love Me",
    color: COLOR.grandOpeningRose,
    image: "crits/luckyCats/loveMe.webp",
    description: "Twenty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.loveMeUpgrades),
  },
  onTheProwl: {
    label: "On The Prowl",
    color: COLOR.orange,
    image: "crits/luckyCats/onTheProwl.webp",
    description: "One hundred and two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.onTheProwlPayouts),
  },
  purrfectShape: {
    label: "Purrfect Shape",
    color: COLOR.fullHouseCrimson,
    image: "crits/luckyCats/purrfectShape.webp",
    description: "Adds 85s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.purrfectShapeSeconds),
  },
  superSharp: {
    label: "Super Sharp",
    color: COLOR.amberMuted,
    image: "crits/luckyCats/superSharp.webp",
    description: "Twenty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.superSharpUpgrades),
  },
  belleOfTheBall: {
    label: "Belle Of The Ball",
    color: COLOR.grandOpeningRose,
    image: "crits/luckyCats/belleOfTheBall.webp",
    description: "Grows every unlocked floor's level by 4.6% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.belleOfTheBallGrowth),
  },
  blueSnooze: {
    label: "Blue Snooze",
    color: COLOR.fastForwardBlue,
    image: "crits/luckyCats/blueSnooze.webp",
    description: "Spreads 52 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.blueSnoozeUpgrades),
  },
  bottledUp: {
    label: "Bottled Up",
    color: COLOR.orange,
    image: "crits/luckyCats/bottledUp.webp",
    description: "Pays 19 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.bottledUpMultiple),
  },
  brassButtons: {
    label: "Brass Buttons",
    color: COLOR.nightShiftIndigo,
    image: "crits/luckyCats/brassButtons.webp",
    description: "Grows this floor's level by 12.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.brassButtonsGrowth),
  },
  campfireCrew: {
    label: "Campfire Crew",
    color: COLOR.amberMuted,
    image: "crits/luckyCats/campfireCrew.webp",
    description: "Spreads 87 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.campfireCrewUpgrades),
  },
  dapperDividend: {
    label: "Dapper Dividend",
    color: COLOR.nightShiftIndigo,
    image: "crits/luckyCats/dapperDividend.webp",
    description: "Pays 10 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.dapperDividendMultiple),
  },
  deckChairBoss: {
    label: "Deck Chair Boss",
    color: COLOR.amber,
    image: "crits/luckyCats/deckChairBoss.webp",
    description: "Grows every unlocked floor's level by 4.7% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.deckChairBossGrowth),
  },
  firesideChat: {
    label: "Fireside Chat",
    color: COLOR.headhunterRust,
    image: "crits/luckyCats/firesideChat.webp",
    description: "Spreads 88 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.firesideChatUpgrades),
  },
  huddleUp: {
    label: "Huddle Up",
    color: COLOR.gold,
    image: "crits/luckyCats/huddleUp.webp",
    description: "Pays 15 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.huddleUpMultiple),
  },
  jugHugger: {
    label: "Jug Hugger",
    color: COLOR.amber,
    image: "crits/luckyCats/jugHugger.webp",
    description: "Grows this floor's level by 12.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.jugHuggerGrowth),
  },
  kindlingKitties: {
    label: "Kindling Kitties",
    color: COLOR.gold,
    image: "crits/luckyCats/kindlingKitties.webp",
    description: "Spreads 89 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.kindlingKittiesUpgrades),
  },
  oldMoney: {
    label: "Old Money",
    color: COLOR.amberMuted,
    image: "crits/luckyCats/oldMoney.webp",
    description: "Pays 9 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.oldMoneyMultiple),
  },
  paidVacation: {
    label: "Paid Vacation",
    color: COLOR.coinGold,
    image: "crits/luckyCats/paidVacation.webp",
    description: "Grows every unlocked floor's level by 4.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.paidVacationGrowth),
  },
  powerNap: {
    label: "Power Nap",
    color: COLOR.teamBuildingCoral,
    image: "crits/luckyCats/powerNap.webp",
    description: "Spreads 90 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.powerNapUpgrades),
  },
  royalTreatment: {
    label: "Royal Treatment",
    color: COLOR.fullHouseCrimson,
    image: "crits/luckyCats/royalTreatment.webp",
    description: "Pays 16 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.royalTreatmentMultiple),
  },
  shadyDeal: {
    label: "Shady Deal",
    color: COLOR.springCleaningMint,
    image: "crits/luckyCats/shadyDeal.webp",
    description: "Grows this floor's level by 12.6% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.shadyDealGrowth),
  },
  sleepItOff: {
    label: "Sleep It Off",
    color: COLOR.sameBoatCoral,
    image: "crits/luckyCats/sleepItOff.webp",
    description: "Spreads 91 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.sleepItOffUpgrades),
  },
  sunnySavings: {
    label: "Sunny Savings",
    color: COLOR.amber,
    image: "crits/luckyCats/sunnySavings.webp",
    description: "Pays 10 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.sunnySavingsMultiple),
  },
  tealAppeal: {
    label: "Teal Appeal",
    color: COLOR.sameBoatCoral,
    image: "crits/luckyCats/tealAppeal.webp",
    description: "Grows every unlocked floor's level by 4.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.tealAppealGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
