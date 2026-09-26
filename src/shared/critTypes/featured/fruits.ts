import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const FRUITS_CRITS = {
  watermelonWindfall: {
    label: "Watermelon Windfall",
    color: COLOR.fullHouseCrimson,
    image: "crits/fruits/watermelonWindfall.png",
    description: "Thirty-four upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.watermelonWindfallUpgrades),
  },
  papayaPayroll: {
    label: "Papaya Payroll",
    color: COLOR.talentScoutOrange,
    image: "crits/fruits/papayaPayroll.png",
    description: "Thirty-four payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.papayaPayrollPayouts),
  },
  kiwiKickback: {
    label: "Kiwi Kickback",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/fruits/kiwiKickback.png",
    description: "Forty-seven payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.kiwiKickbackPayouts,
      ),
  },
  topBanana: {
    label: "Top Banana",
    color: COLOR.starYellow,
    image: "crits/fruits/topBanana.png",
    description: "Forty payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.topBananaPayouts,
      ),
  },
  cherryOnTop: {
    label: "Cherry on Top",
    color: COLOR.doubleDownCrimson,
    image: "crits/fruits/cherryOnTop.png",
    description: "Forty-one upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.cherryOnTopUpgrades),
  },
  peachPerfect: {
    label: "Peach Perfect",
    color: COLOR.grandOpeningRose,
    image: "crits/fruits/peachPerfect.png",
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
    image: "crits/fruits/plumJob.png",
    description: "Twenty-one upgrades and nineteen payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.plumJobUpgrades,
        balance.plumJobPayouts,
      ),
  },
  dragonfruitDynasty: {
    label: "Dragonfruit Dynasty",
    color: COLOR.easterSalePink,
    image: "crits/fruits/dragonfruitDynasty.png",
    description: "Thirty-seven upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.dragonfruitDynastyUpgrades,
      ),
  },
  grapeExpectations: {
    label: "Grape Expectations",
    color: COLOR.halloweenSalePurple,
    image: "crits/fruits/grapeExpectations.png",
    description: "Thirty-eight free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.grapeExpectationsUpgrades),
  },
  pomegranatePortfolio: {
    label: "Pomegranate Portfolio",
    color: COLOR.fireDrillRed,
    image: "crits/fruits/pomegranatePortfolio.png",
    description: "Thirty-two upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.pomegranatePortfolioUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.pomegranatePortfolioUpgrades);
    },
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
