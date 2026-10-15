import type { EventMeta } from "../../eventMeta";

// a snowballing wisp rolls down over the bars
export default {
  label: "Snowball",
  style: "wisp",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    rollsMs: [400, 220] as [number, number], // each roll, quickening
    dropMs: 300, // each drop to the next bar
    levelShare: 0.05, // of the bar's levels, per roll
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
