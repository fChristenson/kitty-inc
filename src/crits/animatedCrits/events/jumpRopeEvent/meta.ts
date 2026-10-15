import type { EventMeta } from "../../eventMeta";

// a wisp skips a rope of light on the clicked bar
export default {
  label: "Jump Rope",
  style: "bounce",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    jumpMs: 1500, // the skipping, the rope turning ever faster
    leapMs: 420, // the last leap and slam
    levelShare: 0.02,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
