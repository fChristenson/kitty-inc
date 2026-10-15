import type { EventMeta } from "../../eventMeta";

// two poi wisps swing rivers of cash into flowers
export default {
  label: "Poi",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1_100, // the rivers pouring
    travelMs: 1_600, // the poi's loop
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
