import type { EventMeta } from "../../eventMeta";

// whistling rockets corkscrew onto the workers
export default {
  label: "Whistlers",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    gapsMs: [240, 120] as [number, number], // between launches, quickening
    flightMs: 600, // each rocket's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
