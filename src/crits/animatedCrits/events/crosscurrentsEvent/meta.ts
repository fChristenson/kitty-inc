import type { EventMeta } from "../../eventMeta";

// two rivers weave up, crossing
export default {
  label: "Crosscurrents",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    travelMs: 1400, // each river's run up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
