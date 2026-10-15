import type { EventMeta } from "../../eventMeta";

// eight rivers pile into a heap
export default {
  label: "Influx",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    riverMs: 520, // each river's run into the middle
    churnMs: 380, // the heap quaking before it erupts
    eruptMs: 460, // the eruption into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
