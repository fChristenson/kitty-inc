import type { EventMeta } from "../../eventMeta";

// spilt glitter is swept up into a heap and shoved into the lock
export default {
  label: "Glitter Spill",
  style: "clutter",
  reward: "a free floor",
  chance: 0.01,
  values: {
    spillMs: 600, // the spill spreading
    dragMs: 120, // each broom stroke's drag (7 strokes)
    liftMs: 60,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
