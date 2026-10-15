import type { EventMeta } from "../../eventMeta";

// a bomb punches down through the bars
export default {
  label: "Bunker Buster",
  style: "explosion",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    fallMs: 700, // the plunge
    buriedMs: 350, // fizzing in the ground before it blows
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
