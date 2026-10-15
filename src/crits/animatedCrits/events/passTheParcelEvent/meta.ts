import type { EventMeta } from "../../eventMeta";

// workers toss a wisp on
export default {
  label: "Pass the Parcel",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    tossesMs: [420, 200] as [number, number], // each toss, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
