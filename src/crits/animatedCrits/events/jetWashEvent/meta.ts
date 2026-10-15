import type { EventMeta } from "../../eventMeta";

// a jet skims each bar
export default {
  label: "Jet Wash",
  style: "mix",
  reward: "tiers + cash",
  chance: 0.01,
  values: {
    passesMs: [420, 260] as [number, number], // each skim, quickening
    hopMs: 150, // the loop over to the next bar
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
