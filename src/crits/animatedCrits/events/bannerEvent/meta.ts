import type { EventMeta } from "../../eventMeta";

// rivers of cash unfurl like banners
export default {
  label: "Banner",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [380, 250] as [number, number], // between banners, quickening
    streamMs: 500, // each banner pouring
    travelMs: 600, // each coin's trip across
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
