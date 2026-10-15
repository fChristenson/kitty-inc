import type { EventMeta } from "../../eventMeta";

// a wisp spins cash into candy floss
export default {
  label: "Candy Floss",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    riseMs: 400, // the wisp rising
    spinMs: 1_000, // the floss spinning
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
