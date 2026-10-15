import type { EventMeta } from "../../eventMeta";

// a bull wisp charges past a matador into the bars
export default {
  label: "Matador",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    chargesMs: [380, 240] as [number, number], // each charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
