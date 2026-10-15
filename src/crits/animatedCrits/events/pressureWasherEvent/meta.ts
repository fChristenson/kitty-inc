import type { EventMeta } from "../../eventMeta";

// jets of cash blast each worker
export default {
  label: "Pressure Washer",
  style: "money",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    jetsMs: [320, 160] as [number, number], // between jets, quickening
    jetMs: 300, // each jet's flight
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
