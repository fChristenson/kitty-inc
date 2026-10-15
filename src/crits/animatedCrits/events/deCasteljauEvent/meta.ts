import type { EventMeta } from "../../eventMeta";

// de Casteljau's scaffold sweeps out a Bézier curve, then cash pours along it
export default {
  label: "de Casteljau",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 250, // the control points flaring up
    drawMs: 1100, // the scaffold sweeping out the curve
    travelMs: 700, // each coin's trip along the curve
    streamMs: 600, // how long the cash pours
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
