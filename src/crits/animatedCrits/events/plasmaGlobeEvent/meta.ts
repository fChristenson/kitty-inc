import type { EventMeta } from "../../eventMeta";

// tendrils draw cash into a core
export default {
  label: "Plasma Globe",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    writheMs: 1_700, // the tendrils writhing, before they whip onto the total
    pulses: 5, // flares spraying coins
    flowMs: 500, // each coin's crawl down a tendril
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
