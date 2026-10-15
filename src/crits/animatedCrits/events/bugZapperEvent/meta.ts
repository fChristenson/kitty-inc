import type { EventMeta } from "../../eventMeta";

// the clicked bar zaps wisp bugs that fly near it
export default {
  label: "Bug Zapper",
  style: "lightning",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    flyMs: 450, // each bug's flight in
    gapsMs: [200, 80] as [number, number], // between zaps, quickening
    levelShare: 0.03, // of the bar's levels, per zap
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
