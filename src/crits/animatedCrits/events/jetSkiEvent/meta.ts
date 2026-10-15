import type { EventMeta } from "../../eventMeta";

// a jet ski tears along the bars
export default {
  label: "Jet Ski",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    runsMs: [340, 220] as [number, number], // each run, quickening
    jumpMs: 160, // each jump down to the next bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
