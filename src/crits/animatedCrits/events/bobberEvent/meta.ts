import type { EventMeta } from "../../eventMeta";

// a wisp rides a jet of cash that surges higher
export default {
  label: "Bobber",
  style: "mix",
  chance: 0.01,
  values: {
    levelMs: 480, // between surges
    launchMs: 260, // the wisp fired into the total
    sweepMs: 250, // the pool erupting after it
    flightMs: 380, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
