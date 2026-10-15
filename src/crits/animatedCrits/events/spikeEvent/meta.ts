import type { EventMeta } from "../../eventMeta";

// a volleyball set and spiked onto bars
export default {
  label: "Spike",
  style: "wisp",
  reward: "tiers",
  chance: 0.01,
  values: {
    setsMs: [480, 320] as [number, number], // each set, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
