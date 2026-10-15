import type { EventMeta } from "../../eventMeta";

// a bucket of cash swung in loops
export default {
  label: "Bucket Swing",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    scoopMs: 300, // the scoop out of the button
    loopsMs: [460, 240] as [number, number], // each loop, quickening
    flingMs: 460, // the bucketful flying into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
