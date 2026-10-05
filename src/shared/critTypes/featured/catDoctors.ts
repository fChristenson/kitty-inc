import type { CAT_DOCTORS_CRITS } from "../../critData/catDoctors";
import type { FeaturedRewards } from "./types";

export const CAT_DOCTORS_REWARDS = {
  headMirror: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.headMirrorGrowth),
  kneeJerk: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.kneeJerkUpgrades),
  scrubbedIn: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.scrubbedInGrowth),
} satisfies FeaturedRewards<typeof CAT_DOCTORS_CRITS>;
