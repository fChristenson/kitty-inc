import type { EventMeta } from "../../eventMeta";

// a ring of bolts surges out over the empty spots
export default {
  label: "Thunder Ring",
  style: "lightning",
  reward: "free hires",
  chance: 0.01,
  values: {
    surges: 4,
    surgeMs: 180, // each surge outward
    gapMs: [220, 100] as [number, number], // between surges, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
