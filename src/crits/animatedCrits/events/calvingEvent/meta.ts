import type { EventMeta } from "../../eventMeta";

// slabs of a cash cliff topple onto the bars
export default {
  label: "Calving",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    riseMs: 300, // the cliff heaping up
    topplesMs: [420, 260] as [number, number], // each slab's topple, quickening
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
