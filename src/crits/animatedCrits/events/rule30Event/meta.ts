import type { EventMeta } from "../../eventMeta";

// the Rule 30 automaton cascades down the screen
export default {
  label: "Rule 30",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    pourMs: 1500, // the rows cascading down
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
