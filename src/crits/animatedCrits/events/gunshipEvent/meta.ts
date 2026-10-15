import type { EventMeta } from "../../eventMeta";

// a circling gunship shoots new workers onto empty spots
export default {
  label: "Gunship",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    enterMs: 350, // roaring out to its orbit
    orbitMs: 1_700, // circling, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
