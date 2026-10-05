import type { TRAVEL_CRITS } from "../../critData/travel";
import type { FeaturedRewards } from "./types";

export const TRAVEL_REWARDS = {
  chooChoo: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chooChooShare),
  clockTower: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.clockTowerShare),
  commuterLine: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.commuterLineShare),
  mainStreet: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.mainStreetShare),
  rooftopRainbow: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rooftopRainbowShare),
  steamExpress: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.steamExpressShare),
} satisfies FeaturedRewards<typeof TRAVEL_CRITS>;
