import type { EventMeta } from "../../eventMeta";

// workers tag each other
export default {
  label: "Laser Tag",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    gapsMs: [260, 110] as [number, number], // between tags, quickening
    aimMs: 140, // each aim line flickering
    fireMs: 160, // each beam blazing
    volleyMs: 300, // every worker firing at once
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
