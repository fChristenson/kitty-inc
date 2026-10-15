import type { EventMeta } from "../../eventMeta";

// two gunslingers' shots meet head-on over each bar
export default {
  label: "Showdown",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    roundsMs: [460, 280] as [number, number], // each round, quickening
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
