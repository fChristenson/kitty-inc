import type { EventMeta } from "../../eventMeta";

// a spiralling arm of lightning sweeps the bars
export default {
  label: "Bolt Spiral",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    spinMs: 1700,
    levelShare: 0.02,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
