import type { EventMeta } from "../../eventMeta";

// a chomper gobbles rows of pellets
export default {
  label: "Gobbler",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    runMs: 2_000, // the gobble along every row, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
