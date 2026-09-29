import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GOTHAM_CRITS = {
  iAmTheNight: {
    label: "I Am the Night",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/gotham/iAmTheNight.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.iAmTheNightWorkers),
  },
  tubs: {
    label: "Tubs",
    color: COLOR.rainCheckBlue,
    image: "crits/gotham/tubs.webp",
    description: "Twenty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tubsPayouts),
  },
  whySoSerious: {
    label: "Why So Serious",
    color: COLOR.halloweenSalePurple,
    image: "crits/gotham/whySoSerious.webp",
    description: "Two tier promotions and twenty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.whySoSeriousTierSteps,
        balance.whySoSeriousUpgrades,
      ),
  },
  batman: {
    label: "The Dark Knight",
    color: COLOR.black,
    image: "crits/gotham/batman.webp",
    description:
      "Repeats the crit on the floor above, 53% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.batmanContinueChance),
  },
  joker: {
    label: "Joker's Wild",
    color: COLOR.purple,
    image: "crits/gotham/joker.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.jokerFloors),
  },
  harleyQuinn: {
    label: "Quinn's Whirlwind",
    color: COLOR.springSalePink,
    image: "crits/gotham/harleyQuinn.webp",
    description:
      "Repeats the crit on the floor above, 36% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.harleyQuinnContinueChance),
  },
  killerCroc: {
    label: "Crocodile Cash",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/killerCroc.webp",
    description: "Adds 23.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.killerCrocShare),
  },
  mrFreeze: {
    label: "Cryo Lock",
    color: COLOR.blue,
    image: "crits/gotham/mrFreeze.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.mrFreezeFloors),
  },
  poisonIvy: {
    label: "Verdant Fortune",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy.webp",
    description: "Adds 10.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.poisonIvyShare),
  },
  scarecrow: {
    label: "Fear Harvest",
    color: COLOR.teaBreakBrown,
    image: "crits/gotham/scarecrow.webp",
    description: "Thirty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.scarecrowUpgrades),
  },
  thePenguin: {
    label: "Iceberg Payday",
    color: COLOR.blue,
    image: "crits/gotham/thePenguin.webp",
    description: "Adds 14s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.thePenguinSeconds),
  },
  theRiddler: {
    label: "Puzzle Box",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/theRiddler.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  bane: {
    label: "Breaking Point",
    color: COLOR.red,
    image: "crits/gotham/bane.webp",
    description: "Forty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.baneUpgrades),
  },
  harleyQuinn2: {
    label: "Harley Quinn's Encore",
    color: COLOR.springSalePink,
    image: "crits/gotham/harleyQuinn2.webp",
    description: "Locks every floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "spendingFreeze"),
  },
  killerCroc2: {
    label: "Croc Rampage",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/killerCroc2.webp",
    description: "Boosts every worker for 31s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.killerCroc2BoostSeconds,
        balance.killerCroc2ExtraWorkers,
      ),
  },
  poisonIvy2: {
    label: "Ivy's Garden",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy2.webp",
    description: "Thirty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.poisonIvy2Upgrades),
  },
  poisonIvy3: {
    label: "Venomous Bloom",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy3.webp",
    description: "Thirty-seven instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.poisonIvy3Payouts),
  },
  thePenguin2: {
    label: "Penguin's Payday",
    color: COLOR.blue,
    image: "crits/gotham/thePenguin2.webp",
    description: "Adds 7.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.thePenguin2Share),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
