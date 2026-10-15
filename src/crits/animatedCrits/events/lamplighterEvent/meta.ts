import type { EventMeta } from "../../eventMeta";

// a wisp hops lamp to lamp over the workers
export default {
  label: "Lamplighter",
  style: "wisp",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    appearMs: 200,
    hopMs: [320, 180] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
