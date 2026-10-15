import type { EventMeta } from "../../eventMeta";

// three wisps tangle in a chaotic three-body dance until one is flung out
export default {
  label: "Three-Body",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    danceMs: 1500, // the chaotic dance
    flingMs: 320, // the flung one's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
