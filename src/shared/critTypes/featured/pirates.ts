import type { PIRATES_CRITS } from "../../critData/pirates";
import type { FeaturedRewards } from "./types";

export const PIRATES_REWARDS = {
  anchorInk: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.anchorInkGrowth),
  blueSails: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.blueSailsUpgrades),
  grumpyDeckhands: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.grumpyDeckhandsGrowth),
  hookAndScar: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.hookAndScarUpgrades),
  plumedPowerhouse: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.plumedPowerhouseGrowth),
  shipmateSqueeze: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.shipmateSqueezeUpgrades),
  skullHatCrest: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.skullHatCrestGrowth),
  stripedSkipper: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.stripedSkipperUpgrades),
  tealPatch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tealPatchGrowth),
} satisfies FeaturedRewards<typeof PIRATES_CRITS>;
