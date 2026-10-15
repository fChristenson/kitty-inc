import type { EventMeta } from "../../eventMeta";

// four-in-a-rows of wisp tokens tier up the bars
export default {
  label: "Connect Four",
  style: "experiment",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    dropsMs: [130, 55] as [number, number], // between drops, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
