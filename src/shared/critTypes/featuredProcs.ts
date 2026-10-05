import { CONFIG } from "../../config";
import { FEATURED_CRITS } from "../critData";
import type { FeaturedReward } from "./featured/types";

export { FEATURED_CRITS };
export {
  createRewardHelpers,
  type FeaturedRewardActions,
  type RewardHelpers,
} from "./featured/rewardHelpers";
export type { FeaturedCritData } from "../critData/types";
export type { FeaturedReward, FeaturedRewardContext } from "./featured/types";

export type FeaturedCritKind = keyof typeof FEATURED_CRITS;
export const FEATURED_CRIT_KINDS = Object.keys(
  FEATURED_CRITS,
) as FeaturedCritKind[];

type FeaturedRewardTable = Record<FeaturedCritKind, FeaturedReward>;
let rewards: FeaturedRewardTable | null = null;
let loadingRewards: Promise<FeaturedRewardTable> | null = null;

// the rewards are a big chunk of code, so they load after startup (main.ts);
// featured crits don't roll until they're in
export function loadFeaturedRewards(): Promise<FeaturedRewardTable> {
  return (loadingRewards ??= import("./featured").then(
    ({ FEATURED_REWARDS }) => (rewards = FEATURED_REWARDS),
  ));
}

export function getFeaturedRewards(): FeaturedRewardTable | null {
  return rewards;
}

// compile-time registration check: every featured crit needs its roll chance
// in CONFIG.crit, or getCritProcChance would silently read 0
CONFIG.crit satisfies Record<`${FeaturedCritKind}Chance`, number>;

// every kind set to false, cloned per call below — rebuilding the whole
// map with Object.fromEntries on every landed crit cost ~0.3ms each, which
// a bulk buy of tens of thousands of upgrades turns into a visible freeze
const ALL_FEATURED_FLAGS_FALSE = Object.fromEntries(
  FEATURED_CRIT_KINDS.map((kind) => [kind, false]),
) as Record<FeaturedCritKind, boolean>;

export function isFeaturedCritKind(kind: string): kind is FeaturedCritKind {
  return kind in ALL_FEATURED_FLAGS_FALSE;
}

export function featuredCritFlags(
  enabled: ReadonlySet<string> = new Set(),
): Record<FeaturedCritKind, boolean> {
  const flags = { ...ALL_FEATURED_FLAGS_FALSE };
  for (const kind of enabled) {
    if (kind in flags) flags[kind as FeaturedCritKind] = true;
  }
  return flags;
}
