import type { EventMeta } from "../../eventMeta";

// a drill bores up through a string of beads into the lock
export default {
  label: "Bead Drill",
  style: "drill",
  reward: "a free floor",
  chance: 0.01,
  values: {
    approachMs: 160,
    boresMs: [220, 120] as [number, number], // each bead's boring, quickening; the lock takes the last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
