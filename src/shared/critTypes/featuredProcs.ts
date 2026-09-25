import { FEATURED_CRIT_INFO } from "./featured";

export { FEATURED_CRIT_INFO };


export type FeaturedCritKind = keyof typeof FEATURED_CRIT_INFO;
export const FEATURED_CRIT_KINDS = Object.keys(
  FEATURED_CRIT_INFO,
) as FeaturedCritKind[];

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
