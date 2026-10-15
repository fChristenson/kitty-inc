import type { EventMeta } from "../../eventMeta";

// a ribbon of cash loops round the workers
export default {
  label: "Gift Wrap",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    travelMs: 1_700, // the wisp's run round every worker and up
    streamMs: 900, // the ribbon pouring after it
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
