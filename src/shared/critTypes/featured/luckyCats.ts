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
} as const satisfies Record<string, FeaturedCritDefinition>;
