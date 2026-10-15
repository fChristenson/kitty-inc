import type { EventMeta } from "../../eventMeta";

// ricochet shots into the bars
export default {
  label: "Trick Shot",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    setMs: 300, // the gun and bumpers appearing
    speeds: [1.8, 3.2] as [number, number], // each round's px per ms, quickening
    gapMs: 120, // between shots
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
