import type { EventMeta } from "../../eventMeta";

// glitter leaves fall all over, a broom sweeps them into a heap on a worker
export default {
  label: "Leaf Fall",
  style: "clutter",
  reward: "worker perma",
  chance: 0.01,
  values: {
    fallMs: 700, // the leaves falling
    dragMs: 120, // each broom stroke's drag (6 strokes)
    liftMs: 60,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
