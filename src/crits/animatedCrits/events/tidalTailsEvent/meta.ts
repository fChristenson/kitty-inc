import type { EventMeta } from "../../eventMeta";

// two galaxies swing past each other, tearing off tidal tails of glitter that
// rain onto the workers
export default {
  label: "Tidal Tails",
  style: "galaxy",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    growMs: 250, // the galaxies swirling up
    passMs: 1300, // their sweep past each other
    gapMs: 90, // between workers' showers
    dropMs: 420, // each star's fall onto its worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
