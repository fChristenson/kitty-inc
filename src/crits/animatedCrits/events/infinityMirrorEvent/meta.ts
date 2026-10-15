import type { EventMeta } from "../../eventMeta";

// the screen nests in itself
export default {
  label: "Infinity Mirror",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    diveMs: 1_600, // diving in through the copies, speeding up
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
