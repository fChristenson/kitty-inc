import type { EventMeta } from "../../eventMeta";

// a domino run of coins topples along the bars
export default {
  label: "Dominoes",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    layMs: 450, // the line dealt out
    runMs: 1_100, // the topple racing down it
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
