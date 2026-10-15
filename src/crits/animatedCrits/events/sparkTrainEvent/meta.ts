import type { EventMeta } from "../../eventMeta";

// a spark rides a rail
export default {
  label: "Spark Train",
  style: "lightning",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    railMs: 360, // the rail snapping out link by link
    rideMs: 1100, // the ride, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
