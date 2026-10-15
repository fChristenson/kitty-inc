import type { EventMeta } from "../../eventMeta";

// wisp runners sprint the bars, passing a baton
export default {
  label: "Relay",
  style: "wisp",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    legsMs: [440, 260] as [number, number], // each leg's sprint, quickening
    tossMs: 140, // each baton toss
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
