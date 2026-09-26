import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const BIG_PERSONALITIES_CRITS = {
  abraCashDabra: {
    label: "Abra-Cash-Dabra",
    color: COLOR.moneyGreen,
    image: "crits/bigPersonalities/abraCashDabra.png",
    description: "Twenty-five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.abraCashDabraPayouts),
  },
  captainOfIndustry: {
    label: "Captain of Industry",
    color: COLOR.fastForwardBlue,
    image: "crits/bigPersonalities/captainOfIndustry.png",
    description: "Twenty-one free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.captainOfIndustryUpgrades),
  },
  clowningAround: {
    label: "Clowning Around",
    color: COLOR.summerSaleOrange,
    image: "crits/bigPersonalities/clowningAround.png",
    description: "Three upgrades and three payouts on every floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.clowningAroundUpgrades);
      actions.payCycles(context.floors, balance.clowningAroundPayouts);
    },
  },
  discoDividend: {
    label: "Disco Dividend",
    color: COLOR.silverTicketGray,
    image: "crits/bigPersonalities/discoDividend.png",
    description: "Eleven payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.discoDividendPayouts),
  },
  mimeYourBusiness: {
    label: "Mime Your Business",
    color: COLOR.winterSaleIceBlue,
    image: "crits/bigPersonalities/mimeYourBusiness.png",
    description: "Eight upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.mimeYourBusinessUpgrades,
      ),
  },
  redCarpetTreatment: {
    label: "Red Carpet Treatment",
    color: COLOR.fullHouseCrimson,
    image: "crits/bigPersonalities/redCarpetTreatment.png",
    description: "Twelve payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.redCarpetTreatmentPayouts,
      ),
  },
  rockTheStock: {
    label: "Rock the Stock",
    color: COLOR.peppermintPink,
    image: "crits/bigPersonalities/rockTheStock.png",
    description: "Sixteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.rockTheStockUpgrades),
  },
  strongReturn: {
    label: "Strong Return",
    color: COLOR.goldenHandshakeGold,
    image: "crits/bigPersonalities/strongReturn.png",
    description: "Twenty-six free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.strongReturnUpgrades),
  },
  theBigCheese: {
    label: "The Big Cheese",
    color: COLOR.sunshineGold,
    image: "crits/bigPersonalities/theBigCheese.png",
    description: "Two tier promotions and thirty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.theBigCheeseTierSteps,
        balance.theBigCheeseUpgrades,
      ),
  },
  queenOfQueens: {
    label: "Queen of Queens",
    color: COLOR.royalFlushPurple,
    image: "crits/bigPersonalities/queenOfQueens.png",
    description: "Twenty-eight free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.queenOfQueensUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
