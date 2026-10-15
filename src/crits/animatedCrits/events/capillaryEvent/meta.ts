import type { EventMeta } from "../../eventMeta";

// threads of cash creep up from a pool onto the bars
export default {
  label: "Capillary",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    spreadMs: 350, // the pool spreading
    climbsMs: [800, 520] as [number, number], // each thread's climb, quickening
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
