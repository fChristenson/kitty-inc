import type { EventMeta } from "../../eventMeta";

// a wisp fired through rings into the lock
export default {
  label: "Human Cannonball",
  style: "wisp",
  reward: "unlock",
  chance: 0.01,
  values: {
    fuseMs: 620, // the fuse burning down
    flightMs: 420, // the flight up into the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
