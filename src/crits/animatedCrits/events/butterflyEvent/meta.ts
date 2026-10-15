import type { EventMeta } from "../../eventMeta";

// mirrored rivers open into butterfly wings
export default {
  label: "Butterfly",
  style: "money",
  chance: 0.01,
  values: {
    streamMs: 900, // the rivers pouring
    travelMs: 1_300, // each coin's trip round a wing and up into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
