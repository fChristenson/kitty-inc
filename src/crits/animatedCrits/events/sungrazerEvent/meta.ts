import type { EventMeta } from "../../eventMeta";

// a comet whips round the button, its cash tail sweeping the bars
export default {
  label: "Sungrazer",
  style: "mix",
  reward: "crit tiers and cash",
  chance: 0.01,
  values: {
    passMs: 1500, // the whole pass round the button
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
