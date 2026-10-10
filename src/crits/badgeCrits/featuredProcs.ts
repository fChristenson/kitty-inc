import { CONFIG } from "../../config";
import type { FEATURED_CRITS } from "./critData";
import type { FeaturedCritData } from "./critData/types";
import { FEATURED_KINDS_BY_CATEGORY } from "./critData/kinds";
import { CRIT_GROUPS } from "./critData/groups";
import type { FeaturedReward } from "./featured/types";

export {
  createRewardHelpers,
  type FeaturedRewardActions,
  type RewardHelpers,
} from "./featured/rewardHelpers";
export type { FeaturedCritData } from "./critData/types";
export type { FeaturedReward, FeaturedRewardContext } from "./featured/types";

export type FeaturedCritKind = keyof typeof FEATURED_CRITS;
type ListedKind =
  (typeof FEATURED_KINDS_BY_CATEGORY)[keyof typeof FEATURED_KINDS_BY_CATEGORY][number];
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// critData/kinds.ts is generated: if this fails, run node scripts/crit-kinds.mjs
true satisfies Same<FeaturedCritKind, ListedKind>;

type Category = keyof typeof FEATURED_KINDS_BY_CATEGORY;
const CATEGORIES = Object.keys(FEATURED_KINDS_BY_CATEGORY) as Category[];
export const FEATURED_CRIT_KINDS: FeaturedCritKind[] = CATEGORIES.flatMap(
  (category) => FEATURED_KINDS_BY_CATEGORY[category],
);

// each featured crit's icon, by the folder its category names
export function featuredCritImages(): Record<FeaturedCritKind, string> {
  const images = {} as Record<FeaturedCritKind, string>;
  for (const category of CATEGORIES)
    for (const kind of FEATURED_KINDS_BY_CATEGORY[category])
      images[kind] = `crits/${category}/${kind}.webp`;
  return images;
}

// the catalog (labels, colours, descriptions) is most of the startup code's
// data, so it loads after the first frame; nothing shows a featured crit
// before (they roll only once the rewards, which wait for it, are in)
type FeaturedCatalog = Record<FeaturedCritKind, FeaturedCritData>;
let catalog: FeaturedCatalog | null = null;
let loadingCatalog: Promise<FeaturedCatalog> | null = null;
const catalogListeners: ((catalog: FeaturedCatalog) => void)[] = [];

export function loadFeaturedCatalog(): Promise<FeaturedCatalog> {
  return (loadingCatalog ??= import("./critData").then(({ FEATURED_CRITS }) => {
    catalog = FEATURED_CRITS;
    for (const listener of catalogListeners.splice(0)) listener(catalog);
    return catalog;
  }));
}

export function isFeaturedCatalogLoaded(): boolean {
  return catalog !== null;
}

// runs once the catalog is in (at once if it is), before anyone awaiting it
export function onFeaturedCatalog(
  listener: (catalog: FeaturedCatalog) => void,
): void {
  if (catalog) listener(catalog);
  else catalogListeners.push(listener);
}

// runs now if the catalog is in, else loads it first
export function withFeaturedCatalog(run: () => void): void {
  if (catalog) run();
  else void loadFeaturedCatalog().then(run);
}

type FeaturedRewardTable = Record<FeaturedCritKind, FeaturedReward>;
let rewards: FeaturedRewardTable | null = null;
let loadingRewards: Promise<FeaturedRewardTable> | null = null;

// the rewards are a big chunk of code, so they load after startup (main.ts);
// featured crits don't roll until they (and the catalog they show) are in
export function loadFeaturedRewards(): Promise<FeaturedRewardTable> {
  return (loadingRewards ??= Promise.all([
    import("./featured"),
    loadFeaturedCatalog(),
  ]).then(([{ FEATURED_REWARDS }]) => (rewards = FEATURED_REWARDS)));
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
let allFeaturedFlagsFalse: Record<FeaturedCritKind, boolean> | null = null;

const FEATURED_KIND_SET: ReadonlySet<string> = new Set(FEATURED_CRIT_KINDS);
export function isFeaturedCritKind(kind: string): kind is FeaturedCritKind {
  return FEATURED_KIND_SET.has(kind);
}

// every main category (CRIT_GROUPS), as all its crits and their chances;
// built at the first roll, which waits for the rewards, so not at startup
type FeaturedGroup = {
  kinds: FeaturedCritKind[];
  chances: number[];
  total: number;
};
let featuredGroups: FeaturedGroup[] | null = null;
function getFeaturedGroups(): FeaturedGroup[] {
  if (featuredGroups) return featuredGroups;
  const groupOf = new Map<string, number>();
  Object.values(CRIT_GROUPS).forEach((categories, group) => {
    for (const category of categories) groupOf.set(category, group);
  });
  const groups = Object.values(CRIT_GROUPS).map(
    (): FeaturedGroup => ({ kinds: [], chances: [], total: 0 }),
  );
  for (const category of CATEGORIES) {
    const group = groups[groupOf.get(category)!];
    for (const kind of FEATURED_KINDS_BY_CATEGORY[category]) {
      const chance = CONFIG.crit[
        `${kind}Chance` as keyof typeof CONFIG.crit
      ] as number;
      group.kinds.push(kind);
      group.chances.push(chance);
      group.total += chance;
    }
  }
  return (featuredGroups = groups);
}

// picks a main category at random, then one of its crits weighted by its chance
export function rollFeaturedCrit(random: () => number): FeaturedCritKind[] {
  const groups = getFeaturedGroups();
  const { kinds, chances, total } =
    groups[Math.floor(random() * groups.length)];
  let roll = random() * total;
  for (let i = 0; i < kinds.length; i++) {
    roll -= chances[i];
    if (roll < 0) return [kinds[i]];
  }
  return [kinds[kinds.length - 1]];
}

// one featured badge picked the way a featured roll picks one; its reward
// needs loadFeaturedRewards before it pays
export function pickFeaturedBadge(): FeaturedCritKind {
  return rollFeaturedCrit(Math.random)[0];
}

export function featuredCritFlags(
  enabled: ReadonlySet<string> = new Set(),
): Record<FeaturedCritKind, boolean> {
  const flags = {
    ...(allFeaturedFlagsFalse ??= Object.fromEntries(
      FEATURED_CRIT_KINDS.map((kind) => [kind, false]),
    ) as Record<FeaturedCritKind, boolean>),
  };
  for (const kind of enabled) {
    if (kind in flags) flags[kind as FeaturedCritKind] = true;
  }
  return flags;
}
