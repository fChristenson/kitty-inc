import type { EventMeta } from "../../eventMeta";

// cash tumbles round a spinning drum that bursts
export default {
  label: "Tumbler",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    spinMs: 1400, // the drum spinning up
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
