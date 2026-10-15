import type { EventMeta } from "../../eventMeta";

// the shards fly into the total
export default {
  label: "Smash and Grab",
  style: "shatter",
  reward: "cash",
  chance: 0.01,
  values: {
    knocksMs: [180, 460, 720], // each knock, the last shattering it
    grabMs: 700, // from the nearest shard set off to the farthest
    flyMs: 380, // each shard's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
