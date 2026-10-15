import type { EventMeta } from "../../eventMeta";

// a heavy wisp drives a light one into a wall, 31 clacks counting out pi
export default {
  label: "Pi Clacks",
  style: "experiment",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 300, // the wall snapping up and the big wisp rolling in
    clackMs: 1400, // from the first roll to the last clack
    rollMs: 200, // the big wisp rolling off
    slamMs: 300, // its leap back down onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
