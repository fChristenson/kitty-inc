import type { EventMeta } from "../../eventMeta";

// pillars of light topple onto spots
export default {
  label: "Light Dominoes",
  style: "beam",
  reward: "free hires",
  chance: 0.01,
  values: {
    fallsMs: [360, 200] as [number, number], // each topple, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
