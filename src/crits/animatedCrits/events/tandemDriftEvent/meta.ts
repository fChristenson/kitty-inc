import type { EventMeta } from "../../eventMeta";

// two racers drift nose to tail round the workers in hairpins, tails out,
// smoke pouring
export default {
  label: "Tandem Drift",
  style: "race",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    raceMs: 2000, // the leader's whole run
    gapMs: 120, // the chaser's gap behind
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
