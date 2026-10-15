import type { EventMeta } from "../../eventMeta";

// two racers switchback up the bars into the top one
export default {
  label: "Hill Climb",
  style: "race",
  reward: "a crit tier + levels",
  chance: 0.01,
  values: {
    raceMs: 1800, // the leader's climb
    gapMs: 120, // the chaser on its tail
    levelShare: 0.05,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
