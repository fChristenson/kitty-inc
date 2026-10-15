import type { EventMeta } from "../../eventMeta";

// runners race to the workers on GO! and freeze on STOP!
export default {
  label: "Statues",
  style: "experiment",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    dashesMs: [350, 250] as [number, number], // each dash, quickening
    freezeMs: 280, // each freeze
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
