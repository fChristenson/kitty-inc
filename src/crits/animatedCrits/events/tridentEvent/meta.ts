import type { EventMeta } from "../../eventMeta";

// three-pronged bolts fork onto the workers
export default {
  label: "Trident",
  style: "lightning",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    volleysMs: [360, 200] as [number, number], // between volleys, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
