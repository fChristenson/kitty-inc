import type { EventMeta } from "../../eventMeta";

// a flood of cash rises up the screen over the bars
export default {
  label: "Flood",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    riseMs: 1_300, // the surface rising, speeding up
    drainMs: 300, // from the top layer to the bottom setting off
    flightMs: 400, // each coin's surge into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
