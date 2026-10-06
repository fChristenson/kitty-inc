import type { COURTSHIP_AND_DATES_CRITS } from "../../critData/courtshipAndDates";
import type { FeaturedRewards } from "./types";

export const COURTSHIP_AND_DATES_REWARDS = {
  airKissAssets: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  blownKissBonus: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  crushCapital: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.crushCapitalDiscount),
  cupidsCommission: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cupidsCommissionSeconds),
  goodnightKissGains: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.goodnightKissGainsContinueChance),
  heartThrobHoldings: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.heartThrobHoldingsTierSteps, balance.heartThrobHoldingsUpgrades),
  kissCamCashout: (context, { actions }) =>
    actions.armCrit([context.floor], "crit"),
  kissingBoothBank: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  loveLetterLedger: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.loveLetterLedgerTierSteps, balance.loveLetterLedgerUpgrades),
  mistletoeMargin: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.mistletoeMarginDiscount),
  rosyCheekReturns: (context, { actions, alternating }) =>
    actions.hireManagers(alternating(context)),
  sealedWithAKiss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.sealedWithAKissContinueChance),
  smittenSavings: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.smittenSavingsTierSteps, balance.smittenSavingsUpgrades),
  sweetheartSurplus: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  lovebirdLoot: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.lovebirdLootDiscount),
  cobaltCrush: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.cobaltCrushShare),
  crownedCrush: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.crownedCrushContinueChance),
  limelightKiss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.limelightKissContinueChance),
  thirdWheelWindfall: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.thirdWheelWindfallShare),
  crushHour: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.crushHourDiscount),
  vestedInterest: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.vestedInterestDiscount),
  slowDanceDividend: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.slowDanceDividendPayouts),
  tangoTycoons: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.tangoTycoonsUpgrades),
  tieBreakerBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tieBreakerBonusPayouts),
  twoStepTreasury: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twoStepTreasuryShare),
  buckleUp: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.buckleUpUpgrades),
  coralCrush: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.coralCrushMultiple),
  cottonCandyKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.cottonCandyKissGrowth),
  giggleFit: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.giggleFitUpgrades),
  limeCrush: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.limeCrushUpgrades),
  smoochDelivery: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.smoochDeliveryUpgrades),
} satisfies FeaturedRewards<typeof COURTSHIP_AND_DATES_CRITS>;
