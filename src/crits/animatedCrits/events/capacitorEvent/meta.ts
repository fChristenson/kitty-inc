import type { EventMeta } from "../../eventMeta";

// electrodes charge each bar
export default {
  label: "Capacitor",
  style: "lightning",
  reward: "tiers",
  chance: 0.01,
  values: {
    chargesMs: [560, 380] as [number, number], // each bar's charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
