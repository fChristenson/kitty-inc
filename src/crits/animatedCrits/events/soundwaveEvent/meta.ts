import type { EventMeta } from "../../eventMeta";

// a wave of cash swells up and down the screen
export default {
  label: "Soundwave",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    formMs: 400, // the line pouring out
    swellMs: 1_300, // the wave swelling
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
