import type { YOGA_AND_STRETCHING_CRITS } from "../critData/yogaAndStretching";
import type { FeaturedRewards } from "./types";

export const YOGA_AND_STRETCHING_REWARDS = {
  hipHingeHeroine: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.hipHingeHeroineContinueChance,
    ),
  kickBackQueen: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      context.floors,
      balance.kickBackQueenUpgrades,
      balance.kickBackQueenPayouts,
    ),
  bendOverBackwards: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bendOverBackwardsDiscount),
  downwardDogDays: (context, { actions, balance, belowAndHere }) =>
    actions.payCycles(belowAndHere(context), balance.downwardDogDaysPayouts),
  plankYouVeryMuch: (context, { actions, balance, highestFloor }) =>
    actions.upgrade(
      [highestFloor(context)],
      balance.plankYouVeryMuchUpgrades,
    ),
  namasteSlay: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.namasteSlayTierSteps,
      balance.namasteSlayUpgrades,
    ),
  mightyOak: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.mightyOakPayouts),
  savasanaSiesta: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.savasanaSiestaContinueChance),
  catCowCrawl: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.catCowCrawlDiscount),
  lizardLounge: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.lizardLoungeContinueChance),
  kneelDeal: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kneelDealShare),
  splitDecision: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.splitDecisionGrowth),
  leanOnMe: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.leanOnMeUpgrades),
  ravenSnuggle: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.ravenSnuggleGrowth),
  sereneSqueeze: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.sereneSqueezeUpgrades),
  seatedEmpress: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.seatedEmpressUpgrades),
  prostratePilgrims: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.prostratePilgrimsGrowth),
  bentKneeOath: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.bentKneeOathMultiple),
  bowingBeforeBeauty: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.bowingBeforeBeautyUpgrades),
  sunsetCongregation: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sunsetCongregationGrowth),
  twinHandOffering: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.twinHandOfferingGrowth),
  prayingHandsPledge: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.prayingHandsPledgeMultiple),
  lowLunge: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.lowLungeMultiple),
  steadyingHand: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.steadyingHandMultiple),
  floorWork: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.floorWorkShare),
  pewterPlunge: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pewterPlungeShare),
} satisfies FeaturedRewards<typeof YOGA_AND_STRETCHING_CRITS>;
