import type { EventMeta } from "../../eventMeta";

// two racers lap a figure eight round the button and a far bar, then dive
// onto empty spots
export default {
  label: "Figure Eight",
  style: "race",
  reward: "free hires",
  chance: 0.01,
  values: {
    raceMs: 1700, // the leader's lap and dive
    gapMs: 120, // the chaser's gap behind
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
