import type { EventMeta } from "../../eventMeta";

// a paper plane stunts into the lock
export default {
  label: "Paper Plane",
  style: "wisp",
  reward: "unlock",
  chance: 0.01,
  values: {
    flightMs: 1900, // the whole flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
