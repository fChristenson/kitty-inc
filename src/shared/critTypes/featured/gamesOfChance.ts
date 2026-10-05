import type { GAMES_OF_CHANCE_CRITS } from "../../critData/gamesOfChance";
import type { FeaturedRewards } from "./types";

export const GAMES_OF_CHANCE_REWARDS = {
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
  highRoller: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.highRollerPayouts,
    ),
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
  snakeEyes: (context, { actions, balance, highestFloor }) =>
    actions.payCycles([highestFloor(context)], balance.snakeEyesPayouts),
  twentyOne: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twentyOneShare),
  wheelOfFortune: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.wheelOfFortuneTierSteps,
      balance.wheelOfFortuneUpgrades,
    ),
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
  betTheFarm: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.betTheFarmFloors),
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
  mahjongMaestro: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.mahjongMaestroTierSteps,
      balance.mahjongMaestroUpgrades,
    ),
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
  pitBoss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.pitBossContinueChance),
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
} satisfies FeaturedRewards<typeof GAMES_OF_CHANCE_CRITS>;
