import type { EventMeta } from "../../eventMeta";

// a shot spun up and heaved onto bars
export default {
  label: "Shot Put",
  style: "wisp",
  reward: "tiers",
  chance: 0.01,
  values: {
    spinsMs: [440, 300] as [number, number], // each wind-up, quickening
    flightsMs: [300, 380] as [number, number], // each put, ever farther
    bounceMs: 220, // the bounce back to the button
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
