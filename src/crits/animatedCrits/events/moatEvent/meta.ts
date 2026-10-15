import type { EventMeta } from "../../eventMeta";

// a river of cash circles the screen like a moat
export default {
  label: "Moat",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the river filling the moat
    travelMs: 900, // each coin's lap
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
