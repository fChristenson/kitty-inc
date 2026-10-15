import type { EventMeta } from "../../eventMeta";

// zigzag bolts of cash crack down onto the bars
export default {
  label: "Bolt of Cash",
  style: "money",
  reward: "tiers + cash",
  chance: 0.01,
  values: {
    boltsMs: [420, 260] as [number, number], // between bolts, quickening
    strikeMs: 300, // each bolt's coins racing down it
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
