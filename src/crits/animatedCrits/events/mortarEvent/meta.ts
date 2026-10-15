import type { EventMeta } from "../../eventMeta";

// a walking mortar barrage
export default {
  label: "Mortar",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [200, 90] as [number, number], // between shells, quickening
    upMs: 220, // each shell's climb out
    hangMs: 250, // out of sight
    downMs: 260, // each shell's fall
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
