import type { EventMeta } from "../../eventMeta";

// heavy rounds punch down through every bar
export default {
  label: "Armor Piercer",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    shotsMs: [320, 180] as [number, number], // between shots, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
