import type { EventMeta } from "../../eventMeta";

// a probe burns out of orbit round the button into the lock
export default {
  label: "Escape Velocity",
  style: "wisp",
  reward: "a free floor",
  chance: 0.01,
  values: {
    orbitsMs: [440, 300] as [number, number], // each orbit, quickening
    escapeMs: 320, // from the last burn to the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
