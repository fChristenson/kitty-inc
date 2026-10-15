import type { EventMeta } from "../../eventMeta";

// a wisp herds a spill of cash into the total
export default {
  label: "Sheepdog",
  style: "mix",
  chance: 0.01,
  values: {
    spillMs: 380, // the cash spilling out
    dartGapsMs: [320, 190] as [number, number], // between darts, quickening
    squeezeMs: 220, // the herd squeezing after a dart
    sweepMs: 280, // the herd setting off for the total
    flightMs: 420, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
