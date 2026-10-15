import type { EventMeta } from "../../eventMeta";

// a grid of little magnets cools into one, then is pulled into the lock like
// iron filings
export default {
  label: "Ising Model",
  style: "experiment",
  reward: "a free floor",
  chance: 0.01,
  values: {
    growMs: 300, // the grid popping in
    coolMs: 1300, // the cooling, flips rippling through
    blazeMs: 200, // the aligned grid blazing
    pullMs: 500, // the pull into the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
