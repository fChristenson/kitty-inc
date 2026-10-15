import type { EventMeta } from "../../eventMeta";

// paddles shock the clicked bar
export default {
  label: "Clear!",
  style: "lightning",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    swoopMs: 300, // the paddles swooping in
    chargesMs: [600, 380] as [number, number], // each charge-up, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
