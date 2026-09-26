import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GOTHAM_CRITS = {
  iAmTheNight: {
    label: "I Am the Night",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/gotham/iAmTheNight.png",
    description: "Twenty-seven free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.iAmTheNightUpgrades),
  },
  tubs: {
    label: "Tubs",
    color: COLOR.rainCheckBlue,
    image: "crits/gotham/tubs.png",
    description: "Twenty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tubsPayouts),
  },
  whySoSerious: {
    label: "Why So Serious",
    color: COLOR.halloweenSalePurple,
    image: "crits/gotham/whySoSerious.png",
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
    image: "crits/gotham/batman.png",
    description: "Thirty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.batmanUpgrades),
  },
  joker: {
    label: "Joker's Wild",
    color: COLOR.purple,
    image: "crits/gotham/joker.png",
    description: "Thirty-five instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.jokerPayouts),
  },
  harleyQuinn: {
    label: "Quinn's Whirlwind",
    color: COLOR.springSalePink,
    image: "crits/gotham/harleyQuinn.png",
    description: "Thirty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.harleyQuinnUpgrades),
  },
  killerCroc: {
    label: "Crocodile Cash",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/killerCroc.png",
    description: "Forty instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.killerCrocPayouts),
  },
  mrFreeze: {
    label: "Cryo Lock",
    color: COLOR.blue,
    image: "crits/gotham/mrFreeze.png",
    description: "Thirty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.mrFreezeUpgrades),
  },
  poisonIvy: {
    label: "Verdant Fortune",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy.png",
    description: "Thirty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.poisonIvyPayouts),
  },
  scarecrow: {
    label: "Fear Harvest",
    color: COLOR.teaBreakBrown,
    image: "crits/gotham/scarecrow.png",
    description: "Thirty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.scarecrowUpgrades),
  },
  thePenguin: {
    label: "Iceberg Payday",
    color: COLOR.blue,
    image: "crits/gotham/thePenguin.png",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.thePenguinPayouts),
  },
  theRiddler: {
    label: "Puzzle Box",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/theRiddler.png",
    description: "Twenty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.theRiddlerUpgrades),
  },
  bane: {
    label: "Breaking Point",
    color: COLOR.red,
    image: "crits/gotham/bane.png",
    description: "Forty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.baneUpgrades),
  },
  harleyQuinn2: {
    label: "Harley Quinn's Encore",
    color: COLOR.springSalePink,
    image: "crits/gotham/harleyQuinn2.png",
    description: "Thirty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.harleyQuinn2Payouts),
  },
  killerCroc2: {
    label: "Croc Rampage",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/killerCroc2.png",
    description: "Thirty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.killerCroc2Upgrades),
  },
  poisonIvy2: {
    label: "Ivy's Garden",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy2.png",
    description: "Thirty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.poisonIvy2Upgrades),
  },
  poisonIvy3: {
    label: "Venomous Bloom",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy3.png",
    description: "Thirty-seven instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.poisonIvy3Payouts),
  },
  thePenguin2: {
    label: "Penguin's Payday",
    color: COLOR.blue,
    image: "crits/gotham/thePenguin2.png",
    description: "Twenty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.thePenguin2Upgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
