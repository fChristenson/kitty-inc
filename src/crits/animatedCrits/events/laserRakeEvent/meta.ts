import type { EventMeta } from "../../eventMeta";

// a rake of light drags cash across the screen
export default {
  label: "Laser Rake",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    strokesMs: [320, 180] as [number, number], // each yank, quickening
    gatherMs: 500,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
