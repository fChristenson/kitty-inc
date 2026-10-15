import type { EventMeta } from "../../eventMeta";

// two racers hairpin round a worker and dive onto workers
export default {
  label: "Grand Prix",
  style: "race",
  reward: "worker perma",
  chance: 0.01,
  values: {
    raceMs: 1200, // the leader's race
    gapMs: 120, // the chaser behind it
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
