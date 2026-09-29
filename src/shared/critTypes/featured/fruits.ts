import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const FRUITS_CRITS = {
  watermelonWindfall: {
    label: "Watermelon Windfall",
    color: COLOR.fullHouseCrimson,
    image: "crits/fruits/watermelonWindfall.webp",
    description: "Boosts every worker for 68s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.watermelonWindfallBoostSeconds,
        balance.watermelonWindfallExtraWorkers,
      ),
  },
  papayaPayroll: {
    label: "Papaya Payroll",
    color: COLOR.talentScoutOrange,
    image: "crits/fruits/papayaPayroll.webp",
    description: "Thirty-four payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.papayaPayrollPayouts),
  },
  kiwiKickback: {
    label: "Kiwi Kickback",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/fruits/kiwiKickback.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.kiwiKickbackFloors),
  },
  topBanana: {
    label: "Top Banana",
    color: COLOR.starYellow,
    image: "crits/fruits/topBanana.webp",
    description: "Boosts every worker for 45s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.topBananaBoostSeconds,
        balance.topBananaExtraWorkers,
      ),
  },
  cherryOnTop: {
    label: "Cherry on Top",
    color: COLOR.doubleDownCrimson,
    image: "crits/fruits/cherryOnTop.webp",
    description: "Cuts every price in this building by 4.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.cherryOnTopDiscount),
  },
  peachPerfect: {
    label: "Peach Perfect",
    color: COLOR.grandOpeningRose,
    image: "crits/fruits/peachPerfect.webp",
    description: "One tier promotion and twenty-seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.peachPerfectTierSteps,
        balance.peachPerfectUpgrades,
      ),
  },
  plumJob: {
    label: "Plum Job",
    color: COLOR.royalFlushPurple,
    image: "crits/fruits/plumJob.webp",
    description: "Cuts every price in this building by 4.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.plumJobDiscount),
  },
  dragonfruitDynasty: {
    label: "Dragonfruit Dynasty",
    color: COLOR.easterSalePink,
    image: "crits/fruits/dragonfruitDynasty.webp",
    description: "Cuts every price in this building by 4.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(
        context.floors,
        balance.dragonfruitDynastyDiscount,
      ),
  },
  grapeExpectations: {
    label: "Grape Expectations",
    color: COLOR.halloweenSalePurple,
    image: "crits/fruits/grapeExpectations.webp",
    description: "Thirty-eight free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.grapeExpectationsUpgrades),
  },
  pomegranatePortfolio: {
    label: "Pomegranate Portfolio",
    color: COLOR.fireDrillRed,
    image: "crits/fruits/pomegranatePortfolio.webp",
    description: "Thirty-two upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.pomegranatePortfolioUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.pomegranatePortfolioUpgrades);
    },
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
