import type { EventMeta } from "../../eventMeta";

// riders whirl out on a swing ride and are flung onto the workers
export default {
  label: "Swing Ride",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    spinMs: 1_100, // spinning up
    snapsMs: [160, 90] as [number, number], // between chains snapping, quickening
    flyMs: 320, // each rider's flight onto its worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
