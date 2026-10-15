import type { EventMeta } from "../../eventMeta";

// a ball on a lightning chain whirls and smashes each bar
export default {
  label: "Flail",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    whirlsMs: [640, 380] as [number, number], // each whirl, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
