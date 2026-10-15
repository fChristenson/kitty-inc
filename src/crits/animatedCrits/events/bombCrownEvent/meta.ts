import type { EventMeta } from "../../eventMeta";

// a ring of bombs round the lock
export default {
  label: "Bomb Crown",
  style: "explosion",
  reward: "a free floor",
  chance: 0.01,
  values: {
    spinMs: 1000, // the crown forming, spinning and blowing round
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
