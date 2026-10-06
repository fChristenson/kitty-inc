import type { ARCADE_AND_LUCKY_GAMES_CRITS } from "../../critData/arcadeAndLuckyGames";
import type { FeaturedRewards } from "./types";

export const ARCADE_AND_LUCKY_GAMES_REWARDS = {
  bullseye: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  chainReaction: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.chainReactionContinueChance),
  doubleHelix: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.doubleHelixContinueChance),
  eureka: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.eurekaTierSteps,
      balance.eurekaUpgrades,
    ),
  goldMedal: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldMedalShare),
  halfLife: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.halfLifePayouts),
  jackpot: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.jackpotSeconds),
  knockout: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.knockoutUpgrades),
  pearlDiver: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pearlDiverShare),
  roundAndRound: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.roundAndRoundPayouts),
  scratchCard: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.scratchCardDiscount),
  silverware: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.silverwareUpgrades),
  wheelOfFortune: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.wheelOfFortuneTierSteps,
      balance.wheelOfFortuneUpgrades,
    ),
  betTheFarm: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.betTheFarmFloors),
  feedTheKitty: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.feedTheKittyFloors),
  bowlOfBets: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.bowlOfBetsPayouts),
  peekabooPot: (context, { actions, balance, lowestLevel, hereAnd }) =>
    actions.upgrade(
      hereAnd(context, lowestLevel(context)),
      balance.peekabooPotUpgrades,
    ),
  headsOrTails: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.headsOrTailsPayouts),
  highSteaks: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.highSteaksContinueChance),
  lottoLlama: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.lottoLlamaFloors),
  neonStrip: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.neonStripUpgrades),
  oneArmedBandit: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      [context.floor],
      balance.oneArmedBanditUpgrades,
      balance.oneArmedBanditPayouts,
    ),
  slotStickup: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, false)],
      balance.slotStickupPayouts,
    ),
  pachinkoPlunge: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.pachinkoPlungeDiscount),
  photoFinish: (context, { actions, balance, highestFloor, hereAnd }) =>
    actions.upgrade(
      hereAnd(context, highestFloor(context)),
      balance.photoFinishUpgrades,
    ),
  casinoBouncer: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.casinoBouncerContinueChance),
  clipboardKingpin: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.clipboardKingpinContinueChance,
    ),
  earpieceEnforcer: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
} satisfies FeaturedRewards<typeof ARCADE_AND_LUCKY_GAMES_CRITS>;
