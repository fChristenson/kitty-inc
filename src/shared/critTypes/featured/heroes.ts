import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const HEROES_CRITS = {
  blessed: {
    label: "Blessed",
    color: COLOR.heavenlyGold,
    image: "crits/heroes/blessed.webp",
    description: "One tier promotion and three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.blessedTierSteps,
        balance.blessedUpgrades,
      ),
  },
  centurion: {
    label: "Centurion",
    color: COLOR.red,
    image: "crits/heroes/centurion.webp",
    description: "Boosts every worker for 15s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.centurionBoostSeconds,
        balance.centurionExtraWorkers,
      ),
  },
  checkUp: {
    label: "Check Up",
    color: COLOR.cyan,
    image: "crits/heroes/checkUp.webp",
    description: "Four upgrades and two payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.checkUpUpgrades);
      actions.payCycles([floor], balance.checkUpPayouts);
    },
  },
  fireman: {
    label: "First Responder",
    color: COLOR.orange,
    image: "crits/heroes/fireman.webp",
    description: "Three upgrades, then one payout on every floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.firemanUpgrades);
      actions.payCycles(context.floors, balance.firemanPayouts);
    },
  },
  forTheEmperor: {
    label: "For the Emperor",
    color: COLOR.blue,
    image: "crits/heroes/forTheEmperor.webp",
    description: "Twenty-five upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.forTheEmperorUpgrades),
  },
  forTheKing: {
    label: "For the King",
    color: COLOR.starYellow,
    image: "crits/heroes/forTheKing.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  hammerTime: {
    label: "Hammer Time",
    color: COLOR.red,
    image: "crits/heroes/hammerTime.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  robinHood: {
    label: "Honor among thieves",
    color: COLOR.moneyGreen,
    image: "crits/heroes/robinHood.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  roman: {
    label: "Roman Holiday",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/roman.webp",
    description: "Boosts this floor's workers for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.romanBoostSeconds,
        balance.romanExtraWorkers,
      ),
  },
  samurai: {
    label: "Samurai",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/samurai.webp",
    description: "Cuts every price in this building by 1.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.samuraiDiscount),
  },
  spy: {
    label: "Undercover",
    color: COLOR.nightShiftIndigo,
    image: "crits/heroes/spy.webp",
    description: "Boosts this floor's workers for 23s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.spyBoostSeconds,
        balance.spyExtraWorkers,
      ),
  },
  theLawWon: {
    label: "The Law Won",
    color: COLOR.blue,
    image: "crits/heroes/theLawWon.webp",
    description: "Cuts every price in this building by 1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.theLawWonDiscount),
  },
  victorian: {
    label: "High Society",
    color: COLOR.gold,
    image: "crits/heroes/victorian.webp",
    description: "Boosts this floor's workers for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.victorianBoostSeconds,
        balance.victorianExtraWorkers,
      ),
  },
  uchihaItachi: {
    label: "Big brother",
    color: COLOR.doubleDownCrimson,
    image: "crits/heroes/uchihaItachi.webp",
    description: "Grows this floor's level by 12.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.uchihaItachiGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
