import type { EventMeta } from "../../eventMeta";

// a jet of cash peels off eddies into the bars
export default {
  label: "Jet Stream",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the jet blasting
    travelMs: 800, // each coin's trip along the jet
    eddyMs: 450, // each eddy's swirl into its bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
