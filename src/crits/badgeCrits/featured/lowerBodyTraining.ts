import type { LOWER_BODY_TRAINING_CRITS } from "../critData/lowerBodyTraining";
import type { FeaturedRewards } from "./types";

export const LOWER_BODY_TRAINING_REWARDS = {
  peachyKeen: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.peachyKeenDiscount),
  gluteGains: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.gluteGainsFloors),
  squatSiren: (context, { balance, cheapest, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      cheapest(context),
      balance.squatSirenTierSteps,
      balance.squatSirenUpgrades,
    ),
  deepSquatDazzle: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.deepSquatDazzleDiscount),
  copperCrouch: (context, { balance, belowAndHere, upgradeAndPay }) =>
    upgradeAndPay(
      belowAndHere(context),
      balance.copperCrouchUpgrades,
      balance.copperCrouchPayouts,
    ),
  legsForDays: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.legsForDaysContinueChance),
  melonPicnic: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(
      alternating(context),
      Math.floor(topLevel(context) / 2),
    ),
  juicePress: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.juicePressBoostSeconds,
      balance.juicePressExtraWorkers,
    ),
  rindBreaker: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.rindBreakerFloors),
  seedStorm: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.seedStormContinueChance),
  priceSqueeze: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.priceSqueezeDiscount),
  belowParallel: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.belowParallelBoostSeconds,
      balance.belowParallelExtraWorkers,
    ),
  deepSquatDividend: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.deepSquatDividendWorkers);
    actions.hireManagers(context.floors);
  },
  legDayLedger: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.legDayLedgerTierSteps,
      balance.legDayLedgerUpgrades,
    ),
  posteriorChainProfits: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.posteriorChainProfitsShare),
  rockBottomRally: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.rockBottomRallyFloors),
  squatGoals: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  sumoStanceStocks: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  backSquatBounty: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.backSquatBountyBoostSeconds,
      balance.backSquatBountyExtraWorkers,
    ),
  lowSquatLoot: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lowSquatLootShare),
  squatQueenCapital: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.squatQueenCapitalBoostSeconds,
      balance.squatQueenCapitalExtraWorkers,
    ),
  bunAndBurn: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bunAndBurnDiscount),
  quadSquadQuarterly: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.quadSquadQuarterlyShare),
  crouchingKiss: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.crouchingKissSeconds),
  calfKissPilgrim: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.calfKissPilgrimUpgrades),
  thunderThighHymn: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.thunderThighHymnUpgrades),
  sculptedLegDevotee: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sculptedLegDevoteeGrowth),
  twinThighDevotion: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.twinThighDevotionMultiple),
  pillarLegsPraise: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pillarLegsPraiseUpgrades),
  quadTemple: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.quadTempleUpgrades),
  quadricepPrayer: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.quadricepPrayerGrowth),
} satisfies FeaturedRewards<typeof LOWER_BODY_TRAINING_CRITS>;
