import type { EventMeta } from "../../eventMeta";

// converging bolts strike new workers into being
export default {
  label: "Sculptor",
  style: "lightning",
  reward: "hires",
  chance: 0.01,
  values: {
    chargesMs: [200, 100] as [number, number], // each charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
