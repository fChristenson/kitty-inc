import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createMafiaRewards({
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
    theCatfather: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theCatfatherTierSteps,
        balance.theCatfatherUpgrades,
      ),
    unrefusableOffer: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.unrefusableOfferPayouts,
      ),
    briefcaseBonus: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.briefcaseBonusUpgrades,
        balance.briefcaseBonusPayouts,
      ),
    violinCaseCaper: (context) =>
      actions.payCycles([context.floor], balance.violinCaseCaperPayouts),
    technicolorTake: (context) =>
      actions.payCycles(context.floors, balance.technicolorTakePayouts),
    stringsAttached: (context) =>
      actions.upgrade(alternating(context), balance.stringsAttachedUpgrades),
    fiddlesticksFund: (context) =>
      actions.payCycles(alternating(context), balance.fiddlesticksFundPayouts),
    fedoraFlex: (context) =>
      actions.upgrade([context.floor], balance.fedoraFlexUpgrades),
    brimTipper: (context) =>
      actions.upgrade(
        [selectByRate(context, true)],
        balance.brimTipperUpgrades,
      ),
    greenbackFan: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.greenbackFanUpgrades,
        balance.greenbackFanPayouts,
      ),
    craftyConsigliere: (context) =>
      actions.upgrade(
        hereAnd(context, lowestLevel(context)),
        balance.craftyConsigliereUpgrades,
      ),
    cappuccinoCapo: (context) =>
      actions.upgrade(belowAndHere(context), balance.cappuccinoCapoUpgrades),
    demitasseDues: (context) =>
      actions.payCycles(belowAndHere(context), balance.demitasseDuesPayouts),
    latteLoyalty: (context) =>
      actions.upgrade([lowestLevel(context)], balance.latteLoyaltyUpgrades),
    takeTheCannoli: (context) =>
      actions.payCycles([lowestLevel(context)], balance.takeTheCannoliPayouts),
    speakeasyStash: (context) =>
      actions.upgrade([highestFloor(context)], balance.speakeasyStashUpgrades),
    passwordPlease: (context) =>
      actions.payCycles([highestFloor(context)], balance.passwordPleasePayouts),
    hiddenDoorHaul: (context) =>
      actions.upgrade([cheapest(context)], balance.hiddenDoorHaulUpgrades),
    pinstripePension: (context) =>
      actions.upgrade(context.floors, balance.pinstripePensionUpgrades),
    lipsSealed: (context) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.lipsSealedPayouts,
      ),
    protectionRacket: (context) =>
      actions.upgrade(
        hereAnd(context, highestFloor(context)),
        balance.protectionRacketUpgrades,
      ),
    runningBoardRiches: (context) =>
      actions.upgrade(cascadeDown(context), balance.runningBoardRichesUpgrades),
    sundaySauceSitdown: (context) =>
      upgradeAndPay(
        context.floors,
        balance.sundaySauceSitdownUpgrades,
        balance.sundaySauceSitdownPayouts,
      ),
    kissTheRing: (context) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.kissTheRingTierSteps,
        balance.kissTheRingUpgrades,
      ),
    bootlegBarrel: (context) =>
      actions.payCycles([cheapest(context)], balance.bootlegBarrelPayouts),
    wiseguySwagger: (context) =>
      actions.upgrade(
        hereAnd(context, selectByRate(context, false)),
        balance.wiseguySwaggerUpgrades,
      ),
    dontWorryAboutIt: (context) =>
      upgradeAndPay(
        [highestFloor(context)],
        balance.dontWorryAboutItUpgrades,
        balance.dontWorryAboutItPayouts,
      ),
    mindYourOwnBusiness: (context) =>
      upgradeAndPay(
        alternating(context),
        balance.mindYourOwnBusinessUpgrades,
        balance.mindYourOwnBusinessPayouts,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
