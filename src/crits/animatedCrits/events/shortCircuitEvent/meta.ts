import type { EventMeta } from "../../eventMeta";

// bolts arc between the bars
export default {
  label: "Short Circuit",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    arcsMs: [160, 60] as [number, number], // between arcs, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
