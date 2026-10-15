import type { EventMeta } from "../../eventMeta";

// a pen signs in cash and stabs the bars
export default {
  label: "Fountain Pen",
  style: "mix",
  reward: "tiers + cash",
  chance: 0.01,
  values: {
    signMs: 800, // the signature
    strokesMs: [260, 150] as [number, number], // each stroke, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
