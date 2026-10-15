import type { EventMeta } from "../../eventMeta";

// a flood of cash chases a fleeing wisp
export default {
  label: "Flash Flood",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1_100, // the flood pouring
    travelMs: 1_500, // the chase
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
