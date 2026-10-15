import type { EventMeta } from "../../eventMeta";

// bombs swell in out of the distance onto the bars in chained cluster blasts,
// then a giant one onto the clicked bar
export default {
  label: "Incoming",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    flyMs: 800, // each bomb's flight in out of the distance
    gapMs: 170, // between landings
    giantMs: 1300, // the giant bomb's flight
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
