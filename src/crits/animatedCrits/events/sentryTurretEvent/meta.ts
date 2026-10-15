import type { EventMeta } from "../../eventMeta";

// a turret swings and fires bursts into the bars
export default {
  label: "Sentry Turret",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    dropMs: 300, // the turret dropping in
    swingsMs: [180, 90] as [number, number], // each swing, quickening
    levelShare: 0.05, // of the bar's levels, per burst
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
