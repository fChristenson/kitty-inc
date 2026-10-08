import type { GYM_TEAMS_CRITS } from "../critData/gymTeams";
import type { FeaturedRewards } from "./types";

export const GYM_TEAMS_REWARDS = {
  spottersWink: (context, { actions, balance, cheapest, hereAnd }) =>
    actions.payCycles(
      hereAnd(context, cheapest(context)),
      balance.spottersWinkPayouts,
    ),
  spotOn: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.spotOnBoostSeconds,
      balance.spotOnExtraWorkers,
    ),
  tillTheCowsComeHome: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.tillTheCowsComeHomeTierSteps,
      balance.tillTheCowsComeHomeUpgrades,
    ),
  purrFectPair: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.purrFectPairTierSteps,
      balance.purrFectPairUpgrades,
    ),
  doubleTrouble: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.doubleTroubleDiscount),
  copycats: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.copycatsShare),
  gymBuddyBudget: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gymBuddyBudgetShare),
  backToBackBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.backToBackBonusPayouts),
  backupPlan: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.backupPlanUpgrades),
  pocketRocketPayday: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pocketRocketPaydayPayouts),
  shoulderToShoulderShares: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shoulderToShoulderSharesShare),
  tealDeal: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tealDealPayouts),
  trioTrustFund: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.trioTrustFundShare),
  gingerPaycheck: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.gingerPaycheckPayouts),
  threeWaySplit: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.threeWaySplitShare),
  doubleKissDeposit: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.doubleKissDepositPayouts),
  duoKissDividend: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.duoKissDividendPayouts),
  twinSmoochSavings: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.twinSmoochSavingsSeconds),
  redheadHug: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.redheadHugUpgrades),
  blueBobNuzzle: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.blueBobNuzzleMultiple),
  curlyCuddle: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.curlyCuddleGrowth),
  pinkPowerhouses: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkPowerhousesMultiple),
  armInArm: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.armInArmMultiple),
  boxBraidBoost: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.boxBraidBoostGrowth),
  braidWatch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.braidWatchUpgrades),
  headbandTwins: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.headbandTwinsGrowth),
  hipNuzzle: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.hipNuzzleMultiple),
  hitchhikerThumb: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hitchhikerThumbGrowth),
  magentaHype: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.magentaHypeGrowth),
  neonTrimNudge: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.neonTrimNudgeMultiple),
  orangeAndLime: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.orangeAndLimeGrowth),
  peekabooBuddy: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.peekabooBuddyUpgrades),
  pinkTankPat: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkTankPatMultiple),
  gingerGnawers: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.gingerGnawersGrowth),
  gymBuddies: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gymBuddiesShare),
  spandexSquad: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.spandexSquadShare),
  spotterPair: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.spotterPairShare),
  sweatbandSmiles: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sweatbandSmilesShare),
  synchronizedSquat: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.synchronizedSquatShare),
} satisfies FeaturedRewards<typeof GYM_TEAMS_CRITS>;
