import type { EventMeta } from "../../eventMeta";

// a pylon slings cables of light onto every bar
export default {
  label: "Suspension Bridge",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    cablesMs: [150, 70] as [number, number], // between cables, quickening
    tautGapMs: 200,
    levelShare: 0.03, // per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
