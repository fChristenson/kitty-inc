import type { EventMeta } from "../../eventMeta";

// wisps race round the workers and scramble for them when the music stops
export default {
  label: "Musical Chairs",
  style: "wisp",
  reward: "worker tiers + a crit tier",
  chance: 0.01,
  values: {
    circleMs: 1_100, // racing round, ever faster
    dashMs: 220, // each wisp's dive onto its worker
    outMs: 260, // the odd one out's dive into the clicked bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
