import type { EventMeta } from "../../eventMeta";

// two racers hairpin round the lock and dive onto it
export default {
  label: "Pole Position",
  style: "race",
  reward: "a free floor",
  chance: 0.01,
  values: {
    raceMs: 1150, // the leader's race
    gapMs: 120, // the chaser behind it
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
