import type { EventMeta } from "../../eventMeta";

// the screen shrinks away
export default {
  label: "Shrink Ray",
  style: "experiment",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    zapsMs: [250, 580, 860], // each zap
    smallMs: 320, // shrunk to a speck, before springing back
    popMs: 260, // springing back to full size
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
