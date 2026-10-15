import type { EventMeta } from "../../eventMeta";

// three lasers lock onto bars
export default {
  label: "Triangulate",
  style: "beam",
  reward: "levels + tier",
  chance: 0.01,
  values: {
    huntsMs: [420, 200] as [number, number], // hunting each bar, quickening
    fireMs: 150, // the three beams firing
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
