import type { ICE_CREAM_CRITS } from "../critData/iceCream";
import type { FeaturedRewards } from "./types";

export const ICE_CREAM_REWARDS = {
  bananaSplitBonus: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.bananaSplitBonusBoostSeconds,
      balance.bananaSplitBonusExtraWorkers,
    ),
  brainFreezeBonus: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  coneCapital: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.coneCapitalContinueChance),
  cookieDoughCash: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.cookieDoughCashTierSteps,
      balance.cookieDoughCashUpgrades,
    ),
  doubleScoopDividend: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  frozenAssets: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.frozenAssetsFloors),
  gelatoGains: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.gelatoGainsDiscount),
  hotFudgeHustle: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hotFudgeHustleShare),
  maraschinoMoney: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.maraschinoMoneyContinueChance,
    ),
  meltingMargin: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.meltingMarginBoostSeconds,
      balance.meltingMarginExtraWorkers,
    ),
  mintChipMoney: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  neapolitanNetWorth: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.neapolitanNetWorthContinueChance,
    ),
  popsicleProfits: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.popsicleProfitsTierSteps,
      balance.popsicleProfitsUpgrades,
    ),
  rockyRoadReturns: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  scoopDreams: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  sherbetShares: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.sherbetSharesFloors),
  softServeSavings: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.softServeSavingsDiscount),
  sprinkleSurplus: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sprinkleSurplusSeconds),
  sundaeFunday: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.sundaeFundayBoostSeconds,
      balance.sundaeFundayExtraWorkers,
    ),
  waffleWealth: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  coneZoneCredit: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.coneZoneCreditShare),
  rainbowSherbetSurge: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.rainbowSherbetSurgeBoostSeconds,
      balance.rainbowSherbetSurgeExtraWorkers,
    ),
  scoopStacker: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.scoopStackerContinueChance),
  dripLickDrake: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.dripLickDrakeContinueChance),
  scoopSplashDrake: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.scoopSplashDrakeDiscount),
  tankTopSherbet: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tankTopSherbetShare),
  mintChipMuscle: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.mintChipMuscleBoostSeconds, balance.mintChipMuscleExtraWorkers),
  fingerLickFrost: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.fingerLickFrostContinueChance),
  doubleScoopDrake: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.doubleScoopDrakeDiscount),
  rockyRoadRumble: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rockyRoadRumbleShare),
  vanillaWyrm: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.vanillaWyrmBoostSeconds, balance.vanillaWyrmExtraWorkers),
  blueRaspberryBrawler: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.blueRaspberryBrawlerContinueChance),
  coldHardCash: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.coldHardCashShare),
  coneglomerate: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.coneglomerateUpgrades),
  jointAccount: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.jointAccountShare),
  shareTheWealth: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shareTheWealthShare),
  sweetDeal: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.sweetDealPayouts),
  vanillaVenture: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.vanillaVentureUpgrades),
} satisfies FeaturedRewards<typeof ICE_CREAM_CRITS>;
