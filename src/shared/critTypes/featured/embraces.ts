import type { EMBRACES_CRITS } from "../../critData/embraces";
import type { FeaturedRewards } from "./types";

export const EMBRACES_REWARDS = {
  cheekToCheek: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cheekToCheekDiscount),
  cropTopCuddle: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cropTopCuddleBoostSeconds, balance.cropTopCuddleExtraWorkers),
  gildedEmbrace: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.gildedEmbraceContinueChance),
  goldenNecklaceNuzzle: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldenNecklaceNuzzleShare),
  handInHandHustle: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.handInHandHustleContinueChance),
  ironShoulderKiss: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.ironShoulderKissDiscount),
  leanInLoot: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.leanInLootBoostSeconds, balance.leanInLootExtraWorkers),
  rainbowHairHuddle: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.rainbowHairHuddleContinueChance),
  sandwichSmooch: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sandwichSmoochShare),
  silverHairSnuggle: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.silverHairSnuggleBoostSeconds, balance.silverHairSnuggleExtraWorkers),
  evergreenEmbrace: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.evergreenEmbraceBoostSeconds, balance.evergreenEmbraceExtraWorkers),
  moonbeamHuddle: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.moonbeamHuddleDiscount),
  bridalCarryBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.bridalCarryBonusPayouts),
  cheekToCheekCash: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.cheekToCheekCashPayouts),
  embraceEquity: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.embraceEquityUpgrades),
  eyeToEyeEarnings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.eyeToEyeEarningsShare),
  hugItOutIncome: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hugItOutIncomeShare),
  noseToNoseNetWorth: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.noseToNoseNetWorthShare),
  sweptAwaySalary: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.sweptAwaySalaryPayouts),
  warmWelcomeWages: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.warmWelcomeWagesPayouts),
  armCandy: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.armCandyGrowth),
  snowcapSnuggle: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.snowcapSnuggleMultiple),
  cottonCandyCuddle: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.cottonCandyCuddleMultiple),
  leggingsLeanIn: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.leggingsLeanInUpgrades),
  tealBraidNuzzle: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.tealBraidNuzzleUpgrades),
  buzzcutBraidBuddies: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.buzzcutBraidBuddiesMultiple),
  pinkBraidSnuggle: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkBraidSnuggleUpgrades),
} satisfies FeaturedRewards<typeof EMBRACES_CRITS>;
