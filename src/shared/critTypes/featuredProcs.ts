import { CONFIG } from "../../config";
import { FEATURED_CRITS } from "../critData";
import { CRIT_GROUPS } from "../critData/groups";
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

// every main category (CRIT_GROUPS), as all its crits and their chances
const FEATURED_GROUPS = (() => {
  const groupOf = new Map<string, number>();
  Object.values(CRIT_GROUPS).forEach((categories, group) => {
    for (const category of categories) groupOf.set(category, group);
  });
  const groups = Object.values(CRIT_GROUPS).map(() => ({
    kinds: [] as FeaturedCritKind[],
    chances: [] as number[],
    total: 0,
  }));
  for (const kind of FEATURED_CRIT_KINDS) {
    const group = groups[groupOf.get(FEATURED_CRITS[kind].image.split("/")[1])!];
    const chance = CONFIG.crit[
      `${kind}Chance` as keyof typeof CONFIG.crit
    ] as number;
    group.kinds.push(kind);
    group.chances.push(chance);
    group.total += chance;
  }
  return groups;
})();

// picks a main category at random, then one of its crits weighted by its chance
export function rollFeaturedCrit(random: () => number): FeaturedCritKind[] {
  const { kinds, chances, total } =
    FEATURED_GROUPS[Math.floor(random() * FEATURED_GROUPS.length)];
  let roll = random() * total;
  for (let i = 0; i < kinds.length; i++) {
    roll -= chances[i];
    if (roll < 0) return [kinds[i]];
  }
  return [kinds[kinds.length - 1]];
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
