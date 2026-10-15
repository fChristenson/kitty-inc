import type { EventMeta } from "../../eventMeta";

// a beam traces a rally chart, then rockets into the total
export default {
  label: "Rally",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    traceMs: 1_100, // the chart being traced
    rocketMs: 400, // the rocket into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
