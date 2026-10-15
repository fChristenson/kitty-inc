import type { EventMeta } from "../../eventMeta";

// four drills grind into the clicked button from the diagonals until it blows
export default {
  label: "Pincushion",
  style: "drill",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    approachMs: 260, // each drill's flight in
    arriveGapMs: 90, // between drills slamming in round the ring
    stallMs: 600, // each drill stalled on its bite, grinding
    boreMs: 1300, // each drill's shoves, rattling round the ring
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
