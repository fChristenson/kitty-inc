import type { EventMeta } from "../../eventMeta";

// a slug fired through coils
export default {
  label: "Coilgun",
  style: "lightning",
  reward: "tiers",
  chance: 0.01,
  values: {
    shotMs: [320, 200] as [number, number], // each shot, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
