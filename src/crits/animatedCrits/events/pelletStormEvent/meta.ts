import type { EventMeta } from "../../eventMeta";

// pellet blasts onto spots
export default {
  label: "Pellet Storm",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    blastsMs: [300, 180] as [number, number], // between blasts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
