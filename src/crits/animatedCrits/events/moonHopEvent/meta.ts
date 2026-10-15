import type { EventMeta } from "../../eventMeta";

// orbits each bar and slingshots on
export default {
  label: "Moon Hop",
  style: "wisp",
  reward: "tiers",
  chance: 0.01,
  values: {
    orbitsMs: [560, 360] as [number, number], // each orbit, quickening
    hopMs: 160, // each slingshot to the next orbit
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
