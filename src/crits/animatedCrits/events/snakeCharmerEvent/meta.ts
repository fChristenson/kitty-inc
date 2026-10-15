import type { EventMeta } from "../../eventMeta";

// a cobra of cash strikes the workers
export default {
  label: "Snake Charmer",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    riseMs: 350, // the cobra rising
    strikesMs: [380, 220] as [number, number], // each strike, quickening
    diveMs: 300, // the dive into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
