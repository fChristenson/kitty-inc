import type { EventMeta } from "../../eventMeta";

// rings of bombs blow outward ring by ring
export default {
  label: "Concentric",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    ringsMs: [450, 300] as [number, number], // each ring's chain, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
