import type { EventMeta } from "../../eventMeta";

// a sheet of cash rears into a swelling roller, which breaks up into the
// total
export default {
  label: "Hydraulic Jump",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1000, // the sheet shooting out of the button
    growMs: 1200, // the roller swelling, from the jump forming to it breaking
    riseMs: 380, // each coin's rise into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
