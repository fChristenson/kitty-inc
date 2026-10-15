import type { EventMeta } from "../../eventMeta";

// upward lightning tears out of each bar
export default {
  label: "Upstrike",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    climbMs: 260,
    strikesMs: [420, 240] as [number, number], // between strikes, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
