import type { EventMeta } from "../../eventMeta";

// a sniper's crack shots blow open the locked floor
export default {
  label: "Sniper Nest",
  style: "gunfire",
  reward: "an unlock",
  chance: 0.01,
  values: {
    climbMs: 300, // darting up to the nest
    huntMs: 500, // the aim laser hunting
    shotsMs: [380, 300], // between shots
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
