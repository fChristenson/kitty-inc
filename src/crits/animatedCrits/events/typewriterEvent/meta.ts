import type { EventMeta } from "../../eventMeta";

// a wisp types rows of cash through the workers
export default {
  label: "Typewriter",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    linesMs: [520, 300] as [number, number], // each line typed, quickening
    returnMs: 140, // each carriage return
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
