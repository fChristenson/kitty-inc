import type { EventMeta } from "../../eventMeta";

// zigzag rockets burst on the bars, each lighting the next
export default {
  label: "Bottle Rocket",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    fuseMs: 300,
    flightsMs: [480, 300] as [number, number], // each flight, quickening
    levelShare: 0.03, // per rocket
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
