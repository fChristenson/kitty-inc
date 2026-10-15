import type { EventMeta } from "../../eventMeta";

// a stadium wave rolls over the workers
export default {
  label: "Stadium Wave",
  style: "experiment",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    riseMs: 300, // the stacks popping up
    passMs: 1_000, // the wave rolling across
    finalGapMs: 350, // before the whole crowd leaps
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
