import type { EventMeta } from "../../eventMeta";

// a heap of beams is plucked onto the bars
export default {
  label: "Pick-Up Sticks",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    standMs: 220,
    fallMs: 280,
    settleMs: 150,
    plucksMs: [260, 140] as [number, number], // between plucks, quickening
    flyMs: 260,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
