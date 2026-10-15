import type { EventMeta } from "../../eventMeta";

// knights joust on the bars
export default {
  label: "Joust",
  style: "mix",
  reward: "tiers + cash",
  chance: 0.01,
  values: {
    chargesMs: [520, 340] as [number, number], // each charge, quickening
    gapMs: 120, // between jousts
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
