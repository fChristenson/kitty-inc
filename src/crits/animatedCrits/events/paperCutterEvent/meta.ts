import type { EventMeta } from "../../eventMeta";

// a blade of light chops down onto each bar
export default {
  label: "Paper Cutter",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    cutsMs: [480, 280] as [number, number], // each lift and chop, quickening
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
