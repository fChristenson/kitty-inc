import type { EventMeta } from "../../eventMeta";

// shells burst into stars of beams
export default {
  label: "Starburst",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    shellsMs: [300, 180] as [number, number], // between shells, quickening
    riseMs: 260, // each shell's climb
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
