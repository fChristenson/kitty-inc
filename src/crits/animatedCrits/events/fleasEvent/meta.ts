import type { EventMeta } from "../../eventMeta";

// tiny fleas bound round the screen onto the spots
export default {
  label: "Fleas",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    springGapMs: 50,
    hopMs: [300, 200] as [number, number], // each leap, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
