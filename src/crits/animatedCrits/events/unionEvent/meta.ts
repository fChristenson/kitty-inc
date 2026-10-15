import type { EventMeta } from "../../eventMeta";

// the rare "Union" event button, only on a floor with 2+ workers. Clicking it
// streams coins from the floor's other workers into its manager (or a random
// worker) not yet at the top tier; the merged workers leave and it gains one
// perma tier per merged worker plus their own perma tiers, merging only as
// many as it needs to max out.
export default {
  label: "Union",
  chance: 0.01, // per crit whose special-crit gateway hit
} as const satisfies EventMeta;
