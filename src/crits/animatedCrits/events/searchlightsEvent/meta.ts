import type { EventMeta } from "../../eventMeta";

// searchlights catch stashes of cash
export default {
  label: "Searchlights",
  style: "beam",
  chance: 0.01,
  values: {
    searchMs: 1_300, // the lights sweeping
    lockMs: 280, // swinging round onto the total
    streamMs: 350, // each stash's geyser pouring
    travelMs: 500, // each coin's trip up a geyser
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
