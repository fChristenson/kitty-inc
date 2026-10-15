import type { EventMeta } from "../../eventMeta";

// a moon wisp pulls a tide of cash up the screen
export default {
  label: "Moon Tide",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    riseMs: 500, // the moon rising
    pullMs: 900, // the tide pulled up
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
