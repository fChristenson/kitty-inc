import type { EventMeta } from "../../eventMeta";

// the shards rain down past the bars
export default {
  label: "Glass Rain",
  style: "shatter",
  reward: "levels",
  chance: 0.01,
  values: {
    knocksMs: [180, 450, 680], // each knock, the last shattering it
    fallMs: 1_000, // the glass raining down
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
