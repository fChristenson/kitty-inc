import type { EventMeta } from "../../eventMeta";

// a sheet of cash rolls up the screen over the bars
export default {
  label: "Swiss Roll",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    layMs: 450, // the sheet spread
    rollMs: 1_000, // the roll climbing, ever faster
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
