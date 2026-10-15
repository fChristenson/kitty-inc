import type { EventMeta } from "../../eventMeta";

// a wisp slingshots round the bars
export default {
  label: "Gravity Assist",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    flightMs: 1_900, // the whole flight, speeding up
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
