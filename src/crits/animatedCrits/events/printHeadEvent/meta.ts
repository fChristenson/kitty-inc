import type { EventMeta } from "../../eventMeta";

// a print head prints new workers
export default {
  label: "Print Head",
  style: "beam",
  reward: "hires",
  chance: 0.01,
  values: {
    linesMs: [45, 28] as [number, number], // each printed line, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
