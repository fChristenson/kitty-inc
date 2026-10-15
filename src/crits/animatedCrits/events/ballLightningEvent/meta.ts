import type { EventMeta } from "../../eventMeta";

// a ball of lightning careens round zapping bars and workers
export default {
  label: "Ball Lightning",
  style: "lightning",
  reward: "levels + worker tiers",
  chance: 0.01,
  values: {
    legsMs: [380, 190] as [number, number], // each swerve to a target
    diveMs: 200, // diving into the clicked floor's bar
    levelShare: 0.1, // of a bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
