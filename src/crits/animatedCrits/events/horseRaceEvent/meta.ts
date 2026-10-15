import type { EventMeta } from "../../eventMeta";

// horses race down the bars
export default {
  label: "Horse Race",
  style: "experiment",
  reward: "tiers",
  chance: 0.01,
  values: {
    raceMs: 1100, // the winner's race
    spreadMs: 350, // from the winner to the last across
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
