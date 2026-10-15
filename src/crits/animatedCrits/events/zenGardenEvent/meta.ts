import type { EventMeta } from "../../eventMeta";

// cash raked round the bars like a zen garden
export default {
  label: "Zen Garden",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    rakeMs: 1_300, // the rake down the screen, ever faster
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
