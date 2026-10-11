import { CONFIG } from "../../config";
import type { BADGE_CRITS } from "./critData";
import type { BadgeCritData } from "./critData/types";
import { BADGE_KINDS_BY_CATEGORY } from "./critData/kinds";
import { CRIT_GROUPS } from "./critData/groups";
import type { BadgeReward } from "./rewards/types";

export {
  createRewardHelpers,
  type BadgeRewardActions,
  type RewardHelpers,
} from "./rewards/rewardHelpers";
export type { BadgeCritData } from "./critData/types";
export type { BadgeReward, BadgeRewardContext } from "./rewards/types";

export type BadgeCritKind = keyof typeof BADGE_CRITS;
type ListedKind =
  (typeof BADGE_KINDS_BY_CATEGORY)[keyof typeof BADGE_KINDS_BY_CATEGORY][number];
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// critData/kinds.ts is generated: if this fails, run node scripts/crit-kinds.mjs
true satisfies Same<BadgeCritKind, ListedKind>;

type Category = keyof typeof BADGE_KINDS_BY_CATEGORY;
const CATEGORIES = Object.keys(BADGE_KINDS_BY_CATEGORY) as Category[];
export const BADGE_CRIT_KINDS: BadgeCritKind[] = CATEGORIES.flatMap(
  (category) => BADGE_KINDS_BY_CATEGORY[category],
);

// each badge crit's icon, by the folder its category names
export function badgeCritImages(): Record<BadgeCritKind, string> {
  const images = {} as Record<BadgeCritKind, string>;
  for (const category of CATEGORIES)
    for (const kind of BADGE_KINDS_BY_CATEGORY[category])
      images[kind] = `crits/${category}/${kind}.webp`;
  return images;
}

// the catalog (labels, colours, descriptions) is most of the startup code's
// data, so it loads after the first frame; nothing shows a badge crit
// before (they roll only once the rewards, which wait for it, are in)
type BadgeCatalog = Record<BadgeCritKind, BadgeCritData>;
let catalog: BadgeCatalog | null = null;
let loadingCatalog: Promise<BadgeCatalog> | null = null;
const catalogListeners: ((catalog: BadgeCatalog) => void)[] = [];

export function loadBadgeCatalog(): Promise<BadgeCatalog> {
  return (loadingCatalog ??= import("./critData").then(({ BADGE_CRITS }) => {
    catalog = BADGE_CRITS;
    for (const listener of catalogListeners.splice(0)) listener(catalog);
    return catalog;
  }));
}

export function isBadgeCatalogLoaded(): boolean {
  return catalog !== null;
}

// runs once the catalog is in (at once if it is), before anyone awaiting it
export function onBadgeCatalog(
  listener: (catalog: BadgeCatalog) => void,
): void {
  if (catalog) listener(catalog);
  else catalogListeners.push(listener);
}

// runs now if the catalog is in, else loads it first
export function withBadgeCatalog(run: () => void): void {
  if (catalog) run();
  else void loadBadgeCatalog().then(run);
}

type BadgeRewardTable = Record<BadgeCritKind, BadgeReward>;
let rewards: BadgeRewardTable | null = null;
let loadingRewards: Promise<BadgeRewardTable> | null = null;

// the rewards are a big chunk of code, so they load after startup (main.ts);
// badge crits don't roll until they (and the catalog they show) are in
export function loadBadgeRewards(): Promise<BadgeRewardTable> {
  return (loadingRewards ??= Promise.all([
    import("./rewards"),
    loadBadgeCatalog(),
  ]).then(([{ BADGE_REWARDS }]) => (rewards = BADGE_REWARDS)));
}

export function getBadgeRewards(): BadgeRewardTable | null {
  return rewards;
}

// compile-time registration check: every badge crit needs its roll chance
// in CONFIG.crit, or getCritProcChance would silently read 0
CONFIG.crit satisfies Record<`${BadgeCritKind}Chance`, number>;

// every kind set to false, cloned per call below — rebuilding the whole
// map with Object.fromEntries on every landed crit cost ~0.3ms each, which
// a bulk buy of tens of thousands of upgrades turns into a visible freeze
let allBadgeFlagsFalse: Record<BadgeCritKind, boolean> | null = null;

const BADGE_KIND_SET: ReadonlySet<string> = new Set(BADGE_CRIT_KINDS);
export function isBadgeCritKind(kind: string): kind is BadgeCritKind {
  return BADGE_KIND_SET.has(kind);
}

// every main category (CRIT_GROUPS), as all its crits and their chances;
// built at the first roll, which waits for the rewards, so not at startup
type BadgeGroup = {
  kinds: BadgeCritKind[];
  chances: number[];
  total: number;
};
let badgeGroups: BadgeGroup[] | null = null;
function getBadgeGroups(): BadgeGroup[] {
  if (badgeGroups) return badgeGroups;
  const groupOf = new Map<string, number>();
  Object.values(CRIT_GROUPS).forEach((categories, group) => {
    for (const category of categories) groupOf.set(category, group);
  });
  const groups = Object.values(CRIT_GROUPS).map(
    (): BadgeGroup => ({ kinds: [], chances: [], total: 0 }),
  );
  for (const category of CATEGORIES) {
    const group = groups[groupOf.get(category)!];
    for (const kind of BADGE_KINDS_BY_CATEGORY[category]) {
      const chance = CONFIG.crit[
        `${kind}Chance` as keyof typeof CONFIG.crit
      ] as number;
      group.kinds.push(kind);
      group.chances.push(chance);
      group.total += chance;
    }
  }
  return (badgeGroups = groups);
}

// picks a main category at random, then one of its crits weighted by its chance
export function rollBadgeCrit(random: () => number): BadgeCritKind[] {
  const groups = getBadgeGroups();
  const { kinds, chances, total } =
    groups[Math.floor(random() * groups.length)];
  let roll = random() * total;
  for (let i = 0; i < kinds.length; i++) {
    roll -= chances[i];
    if (roll < 0) return [kinds[i]];
  }
  return [kinds[kinds.length - 1]];
}

// one badge picked the way a badge roll picks one; its reward
// needs loadBadgeRewards before it pays
export function pickBadge(): BadgeCritKind {
  return rollBadgeCrit(Math.random)[0];
}

export function badgeCritFlags(
  enabled: ReadonlySet<string> = new Set(),
): Record<BadgeCritKind, boolean> {
  const flags = {
    ...(allBadgeFlagsFalse ??= Object.fromEntries(
      BADGE_CRIT_KINDS.map((kind) => [kind, false]),
    ) as Record<BadgeCritKind, boolean>),
  };
  for (const kind of enabled) {
    if (kind in flags) flags[kind as BadgeCritKind] = true;
  }
  return flags;
}
