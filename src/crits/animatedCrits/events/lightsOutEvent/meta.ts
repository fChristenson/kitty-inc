import type { EventMeta } from "../../eventMeta";

// the Lights Out puzzle solves itself
export default {
  label: "Lights Out",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    pressesMs: [150, 60] as [number, number], // between presses, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
