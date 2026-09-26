import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGamesOfChanceRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  cheapest,
  belowAndHere,
  hereAnd,
  promoteAndUpgrade,
  upgradeAndPay,
  cascadeDown,
}: RewardHelpers) {
  return {
    bullseye: (context) =>
      actions.upgrade([lowestLevel(context)], balance.bullseyeUpgrades),
    chainReaction: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.chainReactionUpgrades,
      ),
    doubleHelix: (context) =>
      actions.upgrade(alternating(context), balance.doubleHelixUpgrades),
    eureka: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.eurekaTierSteps,
        balance.eurekaUpgrades,
      ),
    goldMedal: (context) =>
      actions.payCycles([context.floor], balance.goldMedalPayouts),
    halfLife: (context) =>
      actions.payCycles(context.floors, balance.halfLifePayouts),
    highRoller: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.highRollerPayouts,
      ),
    jackpot: (context) =>
      actions.upgrade(context.floors, balance.jackpotUpgrades),
    knockout: (context) =>
      actions.upgrade([context.floor], balance.knockoutUpgrades),
    pearlDiver: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.pearlDiverPayouts,
      ),
    roundAndRound: (context) =>
      actions.payCycles(alternating(context), balance.roundAndRoundPayouts),
    scratchCard: (context) =>
      actions.payCycles([context.floor], balance.scratchCardPayouts),
    silverware: (context) =>
      actions.upgrade([highestFloor(context)], balance.silverwareUpgrades),
    snakeEyes: (context) =>
      actions.payCycles([highestFloor(context)], balance.snakeEyesPayouts),
    twentyOne: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.twentyOneUpgrades,
      ),
    wheelOfFortune: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.wheelOfFortuneTierSteps,
        balance.wheelOfFortuneUpgrades,
      ),
    highRoller3: (context) =>
      actions.payCycles([context.floor], balance.highRoller3Payouts),
    splitThePot: (context) => {
      actions.upgrade([context.floor], balance.splitThePotUpgrades);
      actions.upgrade([highestFloor(context)], balance.splitThePotUpgrades);
    },
    highRoller2: (context) =>
      actions.upgrade([context.floor], balance.highRoller2Upgrades),
    pokerNight: (context) =>
      actions.payCycles(context.floors, balance.pokerNightPayouts),
    aceUpTheSleeve: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.aceUpTheSleeveTierSteps,
        balance.aceUpTheSleeveUpgrades,
      ),
    baccaratBaron: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.baccaratBaronPayouts,
      ),
    betTheFarm: (context) =>
      actions.upgrade(context.floors, balance.betTheFarmUpgrades),
    cardShark: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.cardSharkUpgrades,
        balance.cardSharkPayouts,
      ),
    casinoWhale: (context) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.casinoWhaleTierSteps,
        balance.casinoWhaleUpgrades,
      ),
    croupierSweep: (context) =>
      actions.upgrade(belowAndHere(context), balance.croupierSweepUpgrades),
    dealersChoice: (context) =>
      actions.upgrade(alternating(context), balance.dealersChoiceUpgrades),
    feedTheKitty: (context) =>
      actions.upgrade([lowestLevel(context)], balance.feedTheKittyUpgrades),
    bowlOfBets: (context) =>
      actions.payCycles([context.floor], balance.bowlOfBetsPayouts),
    peekabooPot: (context) =>
      actions.upgrade(
        hereAnd(context, lowestLevel(context)),
        balance.peekabooPotUpgrades,
      ),
    headsOrTails: (context) =>
      actions.payCycles(alternating(context), balance.headsOrTailsPayouts),
    highSteaks: (context) =>
      actions.upgrade([highestFloor(context)], balance.highSteaksUpgrades),
    lottoLlama: (context) =>
      actions.payCycles([highestFloor(context)], balance.lottoLlamaPayouts),
    mahjongMaestro: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.mahjongMaestroTierSteps,
        balance.mahjongMaestroUpgrades,
      ),
    neonStrip: (context) =>
      actions.upgrade(cascadeDown(context), balance.neonStripUpgrades),
    oneArmedBandit: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.oneArmedBanditUpgrades,
        balance.oneArmedBanditPayouts,
      ),
    slotStickup: (context) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.slotStickupPayouts,
      ),
    pachinkoPlunge: (context) =>
      actions.payCycles(belowAndHere(context), balance.pachinkoPlungePayouts),
    photoFinish: (context) =>
      actions.upgrade(
        hereAnd(context, highestFloor(context)),
        balance.photoFinishUpgrades,
      ),
    pitBoss: (context) =>
      actions.upgrade([cheapest(context)], balance.pitBossUpgrades),
    casinoBouncer: (context) =>
      actions.upgrade([context.floor], balance.casinoBouncerUpgrades),
    clipboardKingpin: (context) =>
      upgradeAndPay(
        context.floors,
        balance.clipboardKingpinUpgrades,
        balance.clipboardKingpinPayouts,
      ),
    earpieceEnforcer: (context) =>
      upgradeAndPay(
        [highestFloor(context)],
        balance.earpieceEnforcerUpgrades,
        balance.earpieceEnforcerPayouts,
      ),
    pokerChipmunk: (context) =>
      actions.payCycles([cheapest(context)], balance.pokerChipmunkPayouts),
    pokerFace: (context) =>
      actions.upgrade([selectByRate(context, true)], balance.pokerFaceUpgrades),
    stoneColdBluff: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.stoneColdBluffUpgrades,
        balance.stoneColdBluffPayouts,
      ),
    deadpanDeal: (context) =>
      actions.payCycles([lowestLevel(context)], balance.deadpanDealPayouts),
    rouletteWhirl: (context) =>
      actions.payCycles(context.floors, balance.rouletteWhirlPayouts),
    showdown: (context) =>
      actions.upgrade(
        hereAnd(context, selectByRate(context, false)),
        balance.showdownUpgrades,
      ),
    highNoonHand: (context) =>
      actions.payCycles(
        hereAnd(context, highestFloor(context)),
        balance.highNoonHandPayouts,
      ),
    sicBoShaker: (context) =>
      upgradeAndPay(
        alternating(context),
        balance.sicBoShakerUpgrades,
        balance.sicBoShakerPayouts,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
