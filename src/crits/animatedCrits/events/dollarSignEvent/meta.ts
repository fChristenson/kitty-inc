import type { EventMeta } from "../../eventMeta";

// cash writes a giant dollar sign
export default {
  label: "Dollar Sign",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    writeMs: 700, // the sign written
    throbsMs: [180, 220, 200], // before each throb
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
