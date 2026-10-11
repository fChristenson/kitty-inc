import type { Floor } from "../../../gameState";
import type { RewardHelpers } from "./rewardHelpers";

// the only parts of a landed crit's context a badge reward reads
export interface BadgeRewardContext {
  floors: Floor[];
  floor: Floor;
}

// what a badge crit does when it lands
export type BadgeReward = (
  context: BadgeRewardContext,
  helpers: RewardHelpers,
) => void;

// one reward for every crit in a category's data (crits/badgeCrits/critData), no extras
export type BadgeRewards<Data> = Record<keyof Data, BadgeReward>;
