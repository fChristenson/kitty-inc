import type { EventMeta } from "../../eventMeta";

// a wisp bounces down the bars
export default {
  label: "Bar Hop",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    hopsMs: [240, 120] as [number, number], // each hop, quickening
    levelShare: 0.03,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
