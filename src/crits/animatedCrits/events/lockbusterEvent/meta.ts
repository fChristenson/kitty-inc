import type { EventMeta } from "../../eventMeta";

// a ring of guns hammers the locked floor
export default {
  label: "Lockbuster",
  style: "gunfire",
  reward: "unlock",
  chance: 0.01,
  values: {
    ringMs: 500, // the guns fanning into a ring
    shotsMs: [90, 35] as [number, number], // between shots, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
