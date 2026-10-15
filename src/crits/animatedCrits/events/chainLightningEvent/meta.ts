import type { EventMeta } from "../../eventMeta";

// lightning forks from bar to worker to bar
export default {
  label: "Chain Lightning",
  style: "beam",
  reward: "levels + worker tiers",
  chance: 0.01,
  values: {
    gapsMs: [300, 110] as [number, number], // between strikes, quickening
    boltMs: 170, // each bolt crackling
    finaleMs: 280, // the whole chain blazing at once
    levelShare: 0.12, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
