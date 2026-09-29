import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const BIG_PERSONALITIES_CRITS = {
  abraCashDabra: {
    label: "Abra-Cash-Dabra",
    color: COLOR.moneyGreen,
    image: "crits/bigPersonalities/abraCashDabra.webp",
    description: "Adds 6s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.abraCashDabraSeconds),
  },
  captainOfIndustry: {
    label: "Captain of Industry",
    color: COLOR.fastForwardBlue,
    image: "crits/bigPersonalities/captainOfIndustry.webp",
    description: "Boosts this floor's workers for 23s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.captainOfIndustryBoostSeconds,
        balance.captainOfIndustryExtraWorkers,
      ),
  },
  clowningAround: {
    label: "Clowning Around",
    color: COLOR.summerSaleOrange,
    image: "crits/bigPersonalities/clowningAround.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.clowningAroundFloors),
  },
  discoDividend: {
    label: "Disco Dividend",
    color: COLOR.silverTicketGray,
    image: "crits/bigPersonalities/discoDividend.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  mimeYourBusiness: {
    label: "Mime Your Business",
    color: COLOR.winterSaleIceBlue,
    image: "crits/bigPersonalities/mimeYourBusiness.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  redCarpetTreatment: {
    label: "Red Carpet Treatment",
    color: COLOR.fullHouseCrimson,
    image: "crits/bigPersonalities/redCarpetTreatment.webp",
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
    image: "crits/bigPersonalities/rockTheStock.webp",
    description: "Adds 3.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rockTheStockShare),
  },
  strongReturn: {
    label: "Strong Return",
    color: COLOR.goldenHandshakeGold,
    image: "crits/bigPersonalities/strongReturn.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  theBigCheese: {
    label: "The Big Cheese",
    color: COLOR.sunshineGold,
    image: "crits/bigPersonalities/theBigCheese.webp",
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
    image: "crits/bigPersonalities/queenOfQueens.webp",
    description: "One tier promotion and 11 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.queenOfQueensTierSteps,
        balance.queenOfQueensUpgrades,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
