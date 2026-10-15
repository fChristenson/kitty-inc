import type { EventMeta } from "../../eventMeta";

// an arc climbs the building
export default {
  label: "Jacob's Ladder",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    igniteMs: 260, // the arc striking up between its electrodes
    climbMs: 1_200, // climbing to the top of the screen
    levelShare: 0.12, // of each bar's levels
    holdMs: 700,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
