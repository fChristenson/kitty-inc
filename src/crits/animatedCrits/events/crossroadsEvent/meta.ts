import type { EventMeta } from "../../eventMeta";

// four rivers collide in the middle
export default {
  label: "Crossroads",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 700, // the rivers pouring
    travelMs: 650, // each river's rush in
    eruptMs: 600, // the geyser into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
