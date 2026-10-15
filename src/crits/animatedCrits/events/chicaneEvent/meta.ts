import type { EventMeta } from "../../eventMeta";

// two racers flick through a chicane round the button and swoop onto hires
export default {
  label: "Chicane",
  style: "race",
  reward: "free hires",
  chance: 0.01,
  values: {
    raceMs: 1100, // the leader's race
    gapMs: 120, // the chaser behind it
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
