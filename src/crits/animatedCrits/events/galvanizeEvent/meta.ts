import type { EventMeta } from "../../eventMeta";

// arcs between the bars
export default {
  label: "Galvanize",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    arcsMs: [200, 80] as [number, number], // between arcs, quickening
    levelShare: 0.03, // of a bar's levels, per arc
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
