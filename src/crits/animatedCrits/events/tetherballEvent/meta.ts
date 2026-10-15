import type { EventMeta } from "../../eventMeta";

// a wisp on a rope of cash winds round the clicked bar
export default {
  label: "Tetherball",
  style: "mix",
  reward: "levels + a crit tier + cash",
  chance: 0.01,
  values: {
    launchMs: 250, // flying out to the rope's length
    spinMs: 1_500, // winding in, ever faster
    levelShare: 0.1, // of the bar's levels, per lap
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
