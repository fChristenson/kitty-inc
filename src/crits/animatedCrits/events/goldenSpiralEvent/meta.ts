import type { EventMeta } from "../../eventMeta";

// Fibonacci squares snap in, then a wisp leads cash round the golden spiral
// into the total
export default {
  label: "Golden Spiral",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    buildMs: [160, 90] as [number, number], // between squares, quickening
    traceMs: 900, // the wisp round the spiral
    streamMs: 700, // how long the cash pours
    flyMs: 260, // off the spiral's end into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
