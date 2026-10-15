import type { EventMeta } from "../../eventMeta";

// a tumbleweed bounces in the wind
export default {
  label: "Tumbleweed",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    hopsMs: [150, 220] as [number, number], // each hop, growing
    boundsMs: 260, // each bound back on the gust
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
