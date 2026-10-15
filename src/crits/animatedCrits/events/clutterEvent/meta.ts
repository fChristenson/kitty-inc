import type { EventMeta } from "../../eventMeta";

// a wisp blasts coins evenly over the screen, one big broom sweeps them into
// a heap
export default {
  label: "Clutter",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    enterMs: 300, // the wisp streaking in
    scatterMs: 400, // coins flung all over
    dragMs: 120, // each broom stroke's drag (7 strokes)
    liftMs: 60, // lifting it back to re-plant
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
