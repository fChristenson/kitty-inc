import type { SPA_DAY_CRITS } from "../../critData/spaDay";
import type { FeaturedRewards } from "./types";

export const SPA_DAY_REWARDS = {
  barrelSoak: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.barrelSoakShare),
  bubbleJets: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bubbleJetsShare),
  cedarSpa: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.cedarSpaShare),
  daydreamDip: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.daydreamDipShare),
  hotSprings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hotSpringsShare),
  hotWaterHulk: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hotWaterHulkShare),
  lemonTwist: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lemonTwistShare),
  pigtailGossip: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pigtailGossipShare),
  pinkPlunge: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkPlungeShare),
  poolsideLounge: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.poolsideLoungeShare),
  rimRest: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rimRestShare),
  rusticRetreat: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rusticRetreatShare),
  toesUp: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.toesUpShare),
  twinSplash: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twinSplashShare),
  warmWelcome: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.warmWelcomeShare),
  whirlpoolQueen: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.whirlpoolQueenShare),
  chromeFootRub: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.chromeFootRubDiscount),
  silverSoleSoother: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.silverSoleSootherShare),
  butterHoofRub: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.butterHoofRubBoostSeconds, balance.butterHoofRubExtraWorkers),
  spottedSoleSession: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.spottedSoleSessionContinueChance),
  calfCareRub: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.calfCareRubDiscount),
  twinMooRubdown: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twinMooRubdownShare),
  overallHeiferRub: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.overallHeiferRubBoostSeconds, balance.overallHeiferRubExtraWorkers),
  hellfireHeelRub: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.hellfireHeelRubContinueChance),
  infernalInstep: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.infernalInstepDiscount),
  brimstoneSoles: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.brimstoneSolesShare),
  calfKnotRelief: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.calfKnotReliefBoostSeconds, balance.calfKnotReliefExtraWorkers),
  pressurePointPal: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.pressurePointPalContinueChance),
  archSupportSquad: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.archSupportSquadDiscount),
  heelHoldHero: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.heelHoldHeroShare),
  cozyToeKnead: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cozyToeKneadBoostSeconds, balance.cozyToeKneadExtraWorkers),
  soleMateSession: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.soleMateSessionContinueChance),
  blissfulFootRub: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.blissfulFootRubDiscount),
  postWorkoutRub: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.postWorkoutRubShare),
  dragonfireFootRub: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.dragonfireFootRubDiscount),
  wyrmwoodRubdown: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.wyrmwoodRubdownShare),
  emeraldArchPress: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.emeraldArchPressBoostSeconds, balance.emeraldArchPressExtraWorkers),
  twinFlameToeRub: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.twinFlameToeRubContinueChance),
  scaleboundSoles: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.scaleboundSolesDiscount),
} satisfies FeaturedRewards<typeof SPA_DAY_CRITS>;
