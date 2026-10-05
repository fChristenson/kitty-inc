import type { POLICE_CRITS } from "../../critData/police";
import type { FeaturedRewards } from "./types";

export const POLICE_REWARDS = {
  backwardGlance: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.backwardGlanceUpgrades),
  beatCopBiceps: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.beatCopBicepsGrowth),
  bustedBurglar: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bustedBurglarUpgrades),
  closeShave: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.closeShaveGrowth),
  greenCollar: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.greenCollarUpgrades),
  nightstick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.nightstickGrowth),
  ravenCurls: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.ravenCurlsUpgrades),
  silverShield: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.silverShieldGrowth),
  topBrass: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.topBrassUpgrades),
} satisfies FeaturedRewards<typeof POLICE_CRITS>;
