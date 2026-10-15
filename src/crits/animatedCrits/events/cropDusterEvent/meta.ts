import type { EventMeta } from "../../eventMeta";

// a wisp lays curtains of cash, pass by pass
export default {
  label: "Crop Duster",
  style: "mix",
  chance: 0.01,
  values: {
    passMs: 420, // each pass across
    fallMs: 450, // each coin's fall
    climbMs: 300, // pulling up into the total
    sweepMs: 300, // the heap sweeping up after it
    flightMs: 320, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
