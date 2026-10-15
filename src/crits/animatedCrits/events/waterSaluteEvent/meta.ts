import type { EventMeta } from "../../eventMeta";

// twin jets arch over each bar and crash down
export default {
  label: "Water Salute",
  style: "money",
  reward: "crit tiers and cash",
  chance: 0.01,
  values: {
    salutesMs: [460, 280] as [number, number], // between salutes, quickening
    travelMs: [520, 380] as [number, number], // each jet's flight
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
