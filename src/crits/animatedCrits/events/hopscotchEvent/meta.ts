import type { EventMeta } from "../../eventMeta";

// a wisp plays hopscotch up the bars
export default {
  label: "Hopscotch",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    hopsMs: [380, 200] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
