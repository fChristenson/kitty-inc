import type { EventMeta } from "../../eventMeta";

// rivers whip round a planet wisp into the total
export default {
  label: "Gravity Well",
  chance: 0.01,
  values: {
    gapMs: 160, // between rivers
    streamMs: 500, // how long each pours
    travelMs: 750, // each coin's trip round the planet
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
