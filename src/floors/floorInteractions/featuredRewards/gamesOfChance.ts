import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGamesOfChanceRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
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
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
