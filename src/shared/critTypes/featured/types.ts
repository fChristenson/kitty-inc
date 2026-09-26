import type { Floor } from "../../../gameState";
import type { RewardHelpers } from "./rewardHelpers";

// the only parts of a landed crit's context a featured reward reads
export interface FeaturedRewardContext {
  floors: Floor[];
  floor: Floor;
}

// everything one featured crit is: its display metadata, its icon file and
// the reward it applies, so a crit can't be registered with any part missing.
// `image` is the icon's path under public/; loadAssets registers it under the
// crit's own kind, so the crit's ImageName is its kind
export interface FeaturedCritDefinition {
  label: string;
  color: string;
  image: `crits/${string}/${string}.png`;
  description: string;
  reward: (context: FeaturedRewardContext, helpers: RewardHelpers) => void;
}
