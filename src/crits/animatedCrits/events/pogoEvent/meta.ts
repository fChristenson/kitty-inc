import type { EventMeta } from "../../eventMeta";

// a wisp pogos bar to bar on a jet of cash
export default {
  label: "Pogo",
  style: "mix",
  reward: "cash + levels",
  chance: 0.01,
  values: {
    hopsMs: [420, 230] as [number, number], // each hop, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
