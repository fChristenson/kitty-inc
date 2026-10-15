import type { EventMeta } from "../../eventMeta";

// a pressure cooker builds steam and blows onto the workers
export default {
  label: "Pressure Cooker",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    riseMs: 350, // the cooker rising
    steamsMs: [280, 140] as [number, number], // between steam jets, quickening
    boilMs: 300, // the boil before it blows
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
