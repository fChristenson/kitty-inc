import type { EventMeta } from "../../eventMeta";

// the screen draws back like a slingshot
export default {
  label: "Pull Back",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    pullMs: 600, // the draw back
    thumpsMs: [200, 90] as [number, number], // between thumps, quickening
    slamMs: 160, // the snap forward
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
