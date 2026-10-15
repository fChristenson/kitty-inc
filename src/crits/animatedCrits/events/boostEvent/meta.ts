import type { EventMeta } from "../../eventMeta";

// the rare "Boost" event button. A crit carrying it arms it once clicked;
// clicking it freezes the screen, streams coins into one random on-screen
// worker (or manager) below the top crit tier, and promotes it one crit tier
// (x5 -> x25 -> x125, see CRIT_TIER_CONFIG): while boosted it multiplies its
// floor's speed by that tier's multiplier.
export default {
  label: "Boost",
  chance: 0.01, // per crit whose special-crit gateway hit
} as const satisfies EventMeta;
