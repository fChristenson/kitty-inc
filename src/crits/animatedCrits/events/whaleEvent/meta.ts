import type { EventMeta } from "../../eventMeta";

// a whale blows spouts of cash up onto the workers
export default {
  label: "Whale",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    cruiseMs: 1_500, // the whale's cruise
    spoutMs: 350, // each spout's rise
    streamMs: 1_300, // the sea pouring
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
