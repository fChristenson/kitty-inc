import type { EventMeta } from "../../eventMeta";

// a bomb on a pendulum smashes each end of every income bar
export default {
  label: "Bomb Pendulum",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    swingsMs: [380, 230] as [number, number], // each swing, harder
    reformMs: 80,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
