import type { EventMeta } from "../../eventMeta";

// a Hilbert curve refines, then a river of cash winds along it into the total
export default {
  label: "Hilbert Curve",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    refineMs: 170, // each preview order
    traceMs: 1100, // the river's head winding the whole curve
    streamMs: 450, // how long the river pours
    flyMs: 260, // the head shooting up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
