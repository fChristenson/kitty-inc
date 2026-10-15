import type { EventMeta } from "../../eventMeta";

// two spans of light clank down onto the lock
export default {
  label: "Drawbridge",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    clanksMs: [320, 180] as [number, number], // between clanks, quickening
    dropMs: 220,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
