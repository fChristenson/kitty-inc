import type { EventMeta } from "../../eventMeta";

// curtains of light fold onto the bars
export default {
  label: "Aurora",
  style: "beam",
  reward: "tiers",
  chance: 0.01,
  values: {
    curtainsMs: [460, 320] as [number, number], // between curtains, quickening
    fallMs: 480, // each curtain coming down
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
