import type { EventMeta } from "../../eventMeta";

// a river of cash fans out into a delta onto the workers
export default {
  label: "Delta",
  style: "money",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    streamMs: 900, // the river pouring
    travelMs: 700, // each coin's trip down the trunk
    channelMs: 450, // each channel's run to its worker
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
