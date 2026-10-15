import type { EventMeta } from "../../eventMeta";

// two foam cannons coat each worker
export default {
  label: "Foam Party",
  style: "spray",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    coatsMs: [440, 280] as [number, number], // each coat, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
