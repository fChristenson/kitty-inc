import type { EventMeta } from "../../eventMeta";

// current crawls out to the workers
export default {
  label: "Ground Current",
  style: "lightning",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    crawlMs: 1100, // out to the furthest worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
