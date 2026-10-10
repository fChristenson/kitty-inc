import {
  createRewardHelpers,
  type FeaturedRewardActions,
} from "../featured/rewardHelpers";
import {
  getFeaturedRewards,
  loadFeaturedRewards,
  type FeaturedCritKind,
} from "../featuredProcs";
import type { CritRewardContext } from "../../floorCrits/floorCritRewards";

// binds every featured crit's reward (crits/badgeCrits/featured) to this floor
// module's upgrade/payout actions. Rolled crits only land once the rewards are
// loaded; a forced one before that pays as soon as they arrive
export function createFeaturedCritRewards(actions: FeaturedRewardActions) {
  const helpers = createRewardHelpers(actions);
  return (kind: FeaturedCritKind, context: CritRewardContext): void => {
    const rewards = getFeaturedRewards();
    if (rewards) rewards[kind](context, helpers);
    else
      void loadFeaturedRewards().then((loaded) =>
        loaded[kind](context, helpers),
      );
  };
}
