import type { EventMeta } from "../../eventMeta";

// a charged shot smashes each bar
export default {
  label: "Charge Shot",
  style: "gunfire",
  reward: "tiers",
  chance: 0.01,
  values: {
    chargeMs: [460, 300] as [number, number], // each charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
