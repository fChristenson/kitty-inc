import {
  FEATURED_CRITS,
  FEATURED_CRIT_KINDS,
  createRewardHelpers,
  type FeaturedCritKind,
  type FeaturedRewardActions,
} from "../../../shared/critTypes";
import type { CritRewardContext } from "../index";

// binds every featured crit's own reward (defined next to its metadata in
// shared/critTypes/featured) to this floor module's upgrade/payout actions
export function createFeaturedCritRewards(actions: FeaturedRewardActions) {
  const helpers = createRewardHelpers(actions);
  return Object.fromEntries(
    FEATURED_CRIT_KINDS.map((kind) => [
      kind,
      (context: CritRewardContext) =>
        FEATURED_CRITS[kind].reward(context, helpers),
    ]),
  ) as Record<FeaturedCritKind, (context: CritRewardContext) => void>;
}
