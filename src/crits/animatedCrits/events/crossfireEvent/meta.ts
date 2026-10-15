import type { EventMeta } from "../../eventMeta";

// four corner wisps fire rivers that geyser up
export default {
  label: "Crossfire",
  chance: 0.01,
  values: {
    fireMs: 600, // each corner pouring
    travelMs: 600, // each coin's trip down a river
    geyserMs: 500, // the geyser pouring
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
