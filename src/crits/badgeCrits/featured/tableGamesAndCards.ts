import type {
  TABLE_GAMES_AND_CARDS_CRITS,
} from "../critData/tableGamesAndCards";
import type { FeaturedRewards } from "./types";

export const TABLE_GAMES_AND_CARDS_REWARDS = {
  highRoller: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.highRollerPayouts,
    ),
  snakeEyes: (context, { actions, balance, highestFloor }) =>
    actions.payCycles([highestFloor(context)], balance.snakeEyesPayouts),
  twentyOne: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twentyOneShare),
  highRoller3: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.highRoller3Discount),
  splitThePot: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.splitThePotContinueChance),
  highRoller2: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  pokerNight: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.pokerNightPayouts),
  aceUpTheSleeve: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.aceUpTheSleeveTierSteps,
      balance.aceUpTheSleeveUpgrades,
    ),
  baccaratBaron: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.baccaratBaronPayouts,
    ),
  cardShark: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.cardSharkFloors),
  casinoWhale: (context, { balance, selectByRate, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.casinoWhaleTierSteps,
      balance.casinoWhaleUpgrades,
    ),
  croupierSweep: (context, { actions, alternating }) =>
    actions.hireManagers(alternating(context)),
  dealersChoice: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.dealersChoiceDiscount),
  mahjongMaestro: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.mahjongMaestroTierSteps,
      balance.mahjongMaestroUpgrades,
    ),
  pitBoss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.pitBossContinueChance),
  pokerChipmunk: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.pokerChipmunkFloors),
  pokerFace: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.pokerFaceBoostSeconds,
      balance.pokerFaceExtraWorkers,
    ),
  stoneColdBluff: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  deadpanDeal: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.deadpanDealDiscount),
  rouletteWhirl: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.rouletteWhirlContinueChance),
  showdown: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.showdownWorkers),
  highNoonHand: (context, { actions, balance, highestFloor, hereAnd }) =>
    actions.payCycles(
      hereAnd(context, highestFloor(context)),
      balance.highNoonHandPayouts,
    ),
  sicBoShaker: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
} satisfies FeaturedRewards<typeof TABLE_GAMES_AND_CARDS_CRITS>;
