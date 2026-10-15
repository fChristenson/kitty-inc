import type { EventMeta } from "../../eventMeta";

// wisp balls roll into scoring holes
export default {
  label: "Skee Ball",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    rollMs: 450, // each ball's roll and hop
    ballsMs: [240, 110] as [number, number], // between balls, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
