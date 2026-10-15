import type { EventMeta } from "../../eventMeta";

// a dropped stack of wisps launches its top one into the lock
export default {
  label: "Galilean Cannon",
  style: "bounce",
  reward: "a free floor",
  chance: 0.01,
  values: {
    launchMs: 420, // the top wisp's flight to the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
