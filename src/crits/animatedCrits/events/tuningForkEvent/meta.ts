import type { EventMeta } from "../../eventMeta";

// a fork hums and strikes each bar
export default {
  label: "Tuning Fork",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    humsMs: [520, 300] as [number, number], // each hum, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
