import {
  createRewardHelpers,
  type FeaturedRewardActions,
} from "../featured/rewardHelpers";
import {
  FEATURED_CRIT_KINDS,
  getFeaturedRewards,
  loadFeaturedRewards,
  type FeaturedCritKind,
} from "../featuredProcs";
import type { CritRewardContext } from "../../floorCrits/floorCritRewards";

// binds every featured crit's reward (shared/critTypes/featured) to this floor
// module's upgrade/payout actions. Rolled crits only land once the rewards are
// loaded; a forced one before that pays as soon as they arrive
export function createFeaturedCritRewards(actions: FeaturedRewardActions) {
  const helpers = createRewardHelpers(actions);
  return Object.fromEntries(
    FEATURED_CRIT_KINDS.map((kind) => [
      kind,
      (context: CritRewardContext) => {
        const rewards = getFeaturedRewards();
        if (rewards) rewards[kind](context, helpers);
        else
          void loadFeaturedRewards().then((loaded) =>
            loaded[kind](context, helpers),
          );
      },
    ]),
  ) as Record<FeaturedCritKind, (context: CritRewardContext) => void>;
}
