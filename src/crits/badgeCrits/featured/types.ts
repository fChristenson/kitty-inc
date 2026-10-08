import type { Floor } from "../../../gameState";
import type { RewardHelpers } from "./rewardHelpers";

// the only parts of a landed crit's context a featured reward reads
export interface FeaturedRewardContext {
  floors: Floor[];
  floor: Floor;
}

// what a featured crit does when it lands
export type FeaturedReward = (
  context: FeaturedRewardContext,
  helpers: RewardHelpers,
) => void;

// one reward for every crit in a category's data (crits/badgeCrits/critData), no extras
export type FeaturedRewards<Data> = Record<keyof Data, FeaturedReward>;
