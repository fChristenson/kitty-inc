import type { EventMeta } from "../../eventMeta";

// lit bomb pucks glide along the bars and blow in a chain, a giant last on
// the clicked bar
export default {
  label: "Bomb Shuffleboard",
  style: "explosion",
  reward: "levels and a crit tier",
  chance: 0.01,
  values: {
    slideMs: 320, // each puck's glide to a stop
    fuseMs: 220, // its fuse burning down once it stops
    giantFuseMs: 400, // the giant's
    levelShare: 0.012, // levels per blast
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
