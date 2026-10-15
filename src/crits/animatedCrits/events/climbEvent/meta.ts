import type { EventMeta } from "../../eventMeta";

// a river zigzags up a ladder of wisps to the total
export default {
  label: "Climb",
  chance: 0.01,
  values: {
    leadMs: 300, // the ladder popping up before the river
    streamMs: 1_000, // the river pouring
    travelMs: 1_100, // each coin's climb
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
