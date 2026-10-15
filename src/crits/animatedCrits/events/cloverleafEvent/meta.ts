import type { EventMeta } from "../../eventMeta";

// a river of cash loops a giant four-leaf clover
export default {
  label: "Cloverleaf",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 900, // the river pouring
    travelMs: 1_500, // each coin's trip round the clover
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
