import type { EventMeta } from "../../eventMeta";

// two racers hairpin round the total and dive onto the clicked bar
export default {
  label: "Monaco",
  style: "race",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    raceMs: 1150, // the leader's race
    gapMs: 120, // the chaser behind it
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
