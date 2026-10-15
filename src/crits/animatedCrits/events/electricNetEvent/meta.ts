import type { EventMeta } from "../../eventMeta";

// a net of lightning drops over the screen and cinches on the clicked bar
export default {
  label: "Electric Net",
  style: "lightning",
  reward: "worker tiers + levels + a crit tier",
  chance: 0.01,
  values: {
    dropMs: 1_100, // the net falling, speeding up
    cinchMs: 300, // cinching shut round the clicked bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
