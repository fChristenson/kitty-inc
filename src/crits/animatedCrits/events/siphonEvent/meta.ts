import type { EventMeta } from "../../eventMeta";

// wisps and flowing cash together, on src/crits/animatedCrits/wispCover +
// cashFlow src/crits/animatedCrits/events/siphonEvent: a wisp under the total
// siphons a spiral of cash
export default {
  label: "Siphon",
  chance: 0.01,
  values: {
    streamMs: 1_200, // the river pouring
    travelMs: 800, // each coin's trip up the straw
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
