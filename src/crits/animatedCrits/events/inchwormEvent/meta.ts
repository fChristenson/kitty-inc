import type { EventMeta } from "../../eventMeta";

// a lightning inchworm inches along each bar
export default {
  label: "Inchworm",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    stepsMs: [200, 110] as [number, number], // each inch, the first bar to the last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
