import type { EventMeta } from "../../eventMeta";

// shells split in crosses
export default {
  label: "Crossette",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    shellsMs: [500, 380] as [number, number], // between shells, quickening
    riseMs: 300, // each shell's climb
    splitMs: 160, // each split flying out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
