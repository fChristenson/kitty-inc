import type { EventMeta } from "../../eventMeta";

// a courier wisp carries a river of cash to the locked floor
export default {
  label: "Courier",
  style: "mix",
  reward: "unlock + cash",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the river trailing
    travelMs: 700, // each coin's trip
    holdMs: 500,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
