import type { EventMeta } from "../../eventMeta";

// diagonal rivers weave a net up the screen
export default {
  label: "Lattice",
  style: "money",
  chance: 0.01,
  values: {
    gapMs: 90, // between rivers launching
    streamMs: 700, // how long each pours
    travelMs: 1_000, // each coin's climb
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
