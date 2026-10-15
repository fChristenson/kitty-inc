import type { EventMeta } from "../../eventMeta";

// a shaken glitter globe of whirling cash shatters into flakes that hire
export default {
  label: "Snow Globe",
  style: "mix",
  reward: "free hires + cash",
  chance: 0.01,
  values: {
    shakeMs: 1300, // the three shakes
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
