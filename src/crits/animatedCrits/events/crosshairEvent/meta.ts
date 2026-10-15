import type { EventMeta } from "../../eventMeta";

// a crosshair sweeps, hunts and locks onto the bars
export default {
  label: "Crosshair",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    sweepMs: 400, // the crosshair sweeping in
    huntsMs: [440, 230] as [number, number], // each hunt, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
