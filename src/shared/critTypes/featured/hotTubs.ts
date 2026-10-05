import type { HOT_TUBS_CRITS } from "../../critData/hotTubs";
import type { FeaturedRewards } from "./types";

export const HOT_TUBS_REWARDS = {
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
} satisfies FeaturedRewards<typeof HOT_TUBS_CRITS>;
