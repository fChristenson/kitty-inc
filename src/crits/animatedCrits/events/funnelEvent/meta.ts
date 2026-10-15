import type { EventMeta } from "../../eventMeta";

// cash funnels down into the clicked floor's bar
export default {
  label: "Funnel",
  style: "money",
  reward: "cash + levels + tier",
  chance: 0.01,
  values: {
    streamMs: 1_000, // cash pouring in
    fallMs: 650, // each coin's fall down the funnel
    levelShare: 0.04, // of the bar's levels, per gulp
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
