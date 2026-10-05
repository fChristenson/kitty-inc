import type { CAT_SCIENTISTS_CRITS } from "../../critData/catScientists";
import type { FeaturedRewards } from "./types";

export const CAT_SCIENTISTS_REWARDS = {
  calicoChemist: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.calicoChemistUpgrades),
  fourEyes: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.fourEyesGrowth),
  underTheMicroscope: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.underTheMicroscopeUpgrades),
} satisfies FeaturedRewards<typeof CAT_SCIENTISTS_CRITS>;
