import type { EventMeta } from "../../eventMeta";

// cash spirals into the clicked bar
export default {
  label: "Whirlpool",
  style: "money",
  reward: "levels + a crit tier + cash",
  chance: 0.01,
  values: {
    streamMs: 1_200, // the rivers pouring in
    spiralMs: 700, // each coin's spiral in
    levelShare: 0.1, // of the bar's levels, per gulp
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
