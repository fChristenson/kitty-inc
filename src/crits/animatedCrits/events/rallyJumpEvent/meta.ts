import type { EventMeta } from "../../eventMeta";

// two racers hairpin round the top bar, fly a jump, hairpin round a worker
// and dive onto another
export default {
  label: "Rally Jump",
  style: "race",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    raceMs: 1700, // the leader's whole run
    gapMs: 120, // the chaser behind it
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
