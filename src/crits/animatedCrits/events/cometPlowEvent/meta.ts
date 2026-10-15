import type { EventMeta } from "../../eventMeta";

// a comet plows down through the bars
export default {
  label: "Comet Plow",
  style: "mix",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    plowMs: 1100,
    levelShare: 0.04,
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
