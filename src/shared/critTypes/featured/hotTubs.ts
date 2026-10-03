import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const HOT_TUBS_CRITS = {
  barrelSoak: {
    label: "Barrel Soak",
    color: COLOR.rainCheckBlue,
    image: "crits/hotTubs/barrelSoak.webp",
    description: "Adds 42% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.barrelSoakShare),
  },
  bubbleJets: {
    label: "Bubble Jets",
    color: COLOR.summerSaleOrange,
    image: "crits/hotTubs/bubbleJets.webp",
    description: "Adds 42.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bubbleJetsShare),
  },
  cedarSpa: {
    label: "Cedar Spa",
    color: COLOR.supplyRunTan,
    image: "crits/hotTubs/cedarSpa.webp",
    description: "Adds 42.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.cedarSpaShare),
  },
  daydreamDip: {
    label: "Daydream Dip",
    color: COLOR.cyan,
    image: "crits/hotTubs/daydreamDip.webp",
    description: "Adds 42.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.daydreamDipShare),
  },
  hotSprings: {
    label: "Hot Springs",
    color: COLOR.chairGiveawayBrown,
    image: "crits/hotTubs/hotSprings.webp",
    description: "Adds 42.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hotSpringsShare),
  },
  hotWaterHulk: {
    label: "Hot Water Hulk",
    color: COLOR.rainCheckBlue,
    image: "crits/hotTubs/hotWaterHulk.webp",
    description: "Adds 42.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hotWaterHulkShare),
  },
  lemonTwist: {
    label: "Lemon Twist",
    color: COLOR.rainCheckBlue,
    image: "crits/hotTubs/lemonTwist.webp",
    description: "Adds 42.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.lemonTwistShare),
  },
  pigtailGossip: {
    label: "Pigtail Gossip",
    color: COLOR.internSkyBlue,
    image: "crits/hotTubs/pigtailGossip.webp",
    description: "Adds 42.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pigtailGossipShare),
  },
  pinkPlunge: {
    label: "Pink Plunge",
    color: COLOR.cyan,
    image: "crits/hotTubs/pinkPlunge.webp",
    description: "Adds 42.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pinkPlungeShare),
  },
  poolsideLounge: {
    label: "Poolside Lounge",
    color: COLOR.teal,
    image: "crits/hotTubs/poolsideLounge.webp",
    description: "Adds 42.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.poolsideLoungeShare),
  },
  rimRest: {
    label: "Rim Rest",
    color: COLOR.fastForwardBlue,
    image: "crits/hotTubs/rimRest.webp",
    description: "Adds 43% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rimRestShare),
  },
  rusticRetreat: {
    label: "Rustic Retreat",
    color: COLOR.teaBreakBrown,
    image: "crits/hotTubs/rusticRetreat.webp",
    description: "Adds 43.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rusticRetreatShare),
  },
  toesUp: {
    label: "Toes Up",
    color: COLOR.cyan,
    image: "crits/hotTubs/toesUp.webp",
    description: "Adds 43.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.toesUpShare),
  },
  twinSplash: {
    label: "Twin Splash",
    color: COLOR.teal,
    image: "crits/hotTubs/twinSplash.webp",
    description: "Adds 43.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.twinSplashShare),
  },
  warmWelcome: {
    label: "Warm Welcome",
    color: COLOR.sameBoatCoral,
    image: "crits/hotTubs/warmWelcome.webp",
    description: "Adds 43.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.warmWelcomeShare),
  },
  whirlpoolQueen: {
    label: "Whirlpool Queen",
    color: COLOR.internSkyBlue,
    image: "crits/hotTubs/whirlpoolQueen.webp",
    description: "Adds 43.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.whirlpoolQueenShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
