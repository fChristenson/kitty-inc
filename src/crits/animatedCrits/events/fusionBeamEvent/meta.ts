import type { EventMeta } from "../../eventMeta";

// eight beams fused into one
export default {
  label: "Fusion Beam",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    gatherMs: 900, // the emitters gathering and charging the focus
    fireMs: 340, // the fused beam's climb to the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
