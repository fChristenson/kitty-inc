import type { EventMeta } from "../../eventMeta";

// the screen strobes to a negative
export default {
  label: "Negative",
  style: "experiment",
  chance: 0.01,
  values: {
    gapsMs: [300, 90] as [number, number], // between flips, quickening
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
