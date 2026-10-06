import type { KISSES_AND_POUTS_CRITS } from "../../critData/kissesAndPouts";
import type { FeaturedRewards } from "./types";

export const KISSES_AND_POUTS_REWARDS = {
  butterflyKiss: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.butterflyKissFloors),
  frenchKissFortune: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.frenchKissFortuneBoostSeconds, balance.frenchKissFortuneExtraWorkers),
  glossyPout: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.glossyPoutWorkers),
  kissAndTell: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(lowestLevel(context), balance.kissAndTellTierSteps, balance.kissAndTellUpgrades),
  lipLockLoot: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.lipLockLootBoostSeconds, balance.lipLockLootExtraWorkers),
  lipServiceLoot: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  lipstickLedger: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.lipstickLedgerContinueChance),
  mwahMoney: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.mwahMoneyShare),
  peckPortfolio: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.peckPortfolioFloors),
  puckerUpPayout: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.puckerUpPayoutBoostSeconds, balance.puckerUpPayoutExtraWorkers),
  smoochStocks: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.smoochStocksDiscount),
  stolenKissStash: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.stolenKissStashSeconds),
  cheekPeckProfit: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cheekPeckProfitBoostSeconds, balance.cheekPeckProfitExtraWorkers),
  kissKissCash: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.kissKissCashContinueChance),
  lipBalmBonus: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.lipBalmBonusTierSteps, balance.lipBalmBonusUpgrades),
  poutPower: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.poutPowerShare),
  smackDabSavings: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.smackDabSavingsBoostSeconds, balance.smackDabSavingsExtraWorkers),
  doubleCheekDividend: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.doubleCheekDividendDiscount),
  pinkLipPact: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkLipPactShare),
  rubyLipRendezvous: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.rubyLipRendezvousDiscount),
  scarletPucker: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.scarletPuckerBoostSeconds, balance.scarletPuckerExtraWorkers),
  tripleSmoochSyndicate: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tripleSmoochSyndicateBoostSeconds, balance.tripleSmoochSyndicateExtraWorkers),
  greenbackKiss: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.greenbackKissPayouts),
  kissAndMakeMoney: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.kissAndMakeMoneyPayouts),
  braidedPuckers: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.braidedPuckersUpgrades),
  loveBite: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.loveBiteUpgrades),
  lookalikeLipstick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lookalikeLipstickGrowth),
  necklineKiss: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.necklineKissUpgrades),
  lipstickTrail: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.lipstickTrailMultiple),
  cheekSmoochDuo: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.cheekSmoochDuoUpgrades),
  ponytailPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.ponytailPuckerGrowth),
  tongueTango: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.tongueTangoMultiple),
} satisfies FeaturedRewards<typeof KISSES_AND_POUTS_CRITS>;
