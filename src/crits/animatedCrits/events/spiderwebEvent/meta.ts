import type { EventMeta } from "../../eventMeta";

// spokes, then a spiral, of cash
export default {
  label: "Spiderweb",
  style: "money",
  chance: 0.01,
  values: {
    spokeGapMs: 70, // between spokes shooting out
    spokeStreamMs: 520, // each spoke pouring
    spokeTravelMs: 260, // each coin's trip out a spoke
    spiralStreamMs: 600, // the spiral pouring
    spiralTravelMs: 760, // each coin's trip round the spiral
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
