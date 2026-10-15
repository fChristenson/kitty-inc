import type { EventMeta } from "../../eventMeta";

// fan blasts up through each bar, set off one by one
export default {
  label: "Claymore",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    fuseMs: 300,
    chainMs: [330, 200] as [number, number], // between bars, quickening
    levelShare: 0.02, // per blast round
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
