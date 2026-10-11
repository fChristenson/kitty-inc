import {
  createRewardHelpers,
  type BadgeRewardActions,
} from "../rewards/rewardHelpers";
import {
  getBadgeRewards,
  loadBadgeRewards,
  type BadgeCritKind,
} from "../badgeProcs";
import type { CritRewardContext } from "../../floorCrits/floorCritRewards";

// binds every badge crit's reward (crits/badgeCrits/rewards) to this floor
// module's upgrade/payout actions. Rolled crits only land once the rewards are
// loaded; a forced one before that pays as soon as they arrive
export function createBadgeCritRewards(actions: BadgeRewardActions) {
  const helpers = createRewardHelpers(actions);
  return (kind: BadgeCritKind, context: CritRewardContext): void => {
    const rewards = getBadgeRewards();
    if (rewards) rewards[kind](context, helpers);
    else
      void loadBadgeRewards().then((loaded) =>
        loaded[kind](context, helpers),
      );
  };
}
