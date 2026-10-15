import type { EventMeta } from "../../eventMeta";

// beats, a snare roll, silence, drop
export default {
  label: "Bass Drop",
  style: "experiment",
  chance: 0.01,
  values: {
    beatMs: 260, // between the heavy beats (the roll speeds up from half this)
    silenceMs: 220, // the dead beat before the drop
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
