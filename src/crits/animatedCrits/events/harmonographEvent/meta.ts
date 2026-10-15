import type { EventMeta } from "../../eventMeta";

// a pendulum-swung pen draws a rosette that bursts into cash
export default {
  label: "Harmonograph",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    drawMs: 1600, // the pen drawing, speeding up
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
