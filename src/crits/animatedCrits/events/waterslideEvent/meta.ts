import type { EventMeta } from "../../eventMeta";

// a river loops the loop at every bar
export default {
  label: "Waterslide",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    streamMs: 1_000, // the river pouring
    travelMs: 1_700, // each coin's ride down the slide
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
