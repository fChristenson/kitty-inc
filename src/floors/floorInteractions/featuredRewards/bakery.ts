import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createBakeryRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  cheapest,
  promoteAndUpgrade,
  upgradeAndPay,
  cascadeDown,
}: RewardHelpers) {
  return {
    butterCroissant: (context) =>
      actions.upgrade([context.floor], balance.butterCroissantUpgrades),
    almondEncore: (context) =>
      actions.payCycles([context.floor], balance.almondEncorePayouts),
    babkaRhapsody: (context) =>
      actions.upgrade(alternating(context), balance.babkaRhapsodyUpgrades),
    bagelBoulevard: (context) =>
      actions.payCycles(context.floors, balance.bagelBoulevardPayouts),
    baguetteBaton: (context) =>
      actions.upgrade([lowestLevel(context)], balance.baguetteBatonUpgrades),
    briocheBonanza: (context) =>
      actions.upgrade([context.floor], balance.briocheBonanzaUpgrades),
    breadWinner: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.breadWinnerUpgrades,
        balance.breadWinnerPayouts,
      ),
    challahCharm: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.challahCharmTierSteps,
        balance.challahCharmUpgrades,
      ),
    chouxBusiness: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.chouxBusinessUpgrades,
        balance.chouxBusinessPayouts,
      ),
    cinnamonSpin: (context) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.cinnamonSpinUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.cinnamonSpinUpgrades);
    },
    icingOnTheBun: (context) =>
      actions.payCycles(alternating(context), balance.icingOnTheBunPayouts),
    cruffinSummit: (context) =>
      actions.upgrade([highestFloor(context)], balance.cruffinSummitUpgrades),
    custardCrown: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.custardCrownTierSteps,
        balance.custardCrownUpgrades,
      ),
    danishDaydream: (context) =>
      actions.payCycles([context.floor], balance.danishDaydreamPayouts),
    eclairFlair: (context) =>
      actions.upgrade([context.floor], balance.eclairFlairUpgrades),
    focacciaFiesta: (context) =>
      actions.upgrade(context.floors, balance.focacciaFiestaUpgrades),
    jamSession: (context) =>
      actions.payCycles(context.floors, balance.jamSessionPayouts),
    sconeWithTheWind: (context) =>
      actions.upgrade([cheapest(context)], balance.sconeWithTheWindUpgrades),
    knotYourAverage: (context) => {
      const highest = highestFloor(context);
      actions.upgrade([context.floor], balance.knotYourAverageUpgrades);
      if (highest !== context.floor)
        actions.upgrade([highest], balance.knotYourAverageUpgrades);
    },
    naanStop: (context) =>
      actions.payCycles(context.floors, balance.naanStopPayouts),
    palmierParade: (context) =>
      actions.upgrade(cascadeDown(context), balance.palmierParadeUpgrades),
    pistachioPalace: (context) =>
      actions.upgrade([highestFloor(context)], balance.pistachioPalaceUpgrades),
    pitaPocketPayday: (context) =>
      actions.payCycles([context.floor], balance.pitaPocketPaydayPayouts),
    ryeOnThePrize: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.ryeOnThePrizePayouts,
      ),
    shokupanCloud: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.shokupanCloudUpgrades,
      ),
    sourdoughSunrise: (context) =>
      actions.payCycles([lowestLevel(context)], balance.sourdoughSunrisePayouts),
    strudelCuddle: (context) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.strudelCuddleUpgrades,
        balance.strudelCuddlePayouts,
      ),
    appleOfMyEye: (context) =>
      actions.payCycles(alternating(context), balance.appleOfMyEyePayouts),
    turnoverTreasure: (context) =>
      actions.payCycles([context.floor], balance.turnoverTreasurePayouts),

  } satisfies Record<string, (context: CritRewardContext) => void>;
}
