import type { EventMeta } from "../../eventMeta";

// an X-ray sheet of light reveals new workers
export default {
  label: "X-Ray",
  style: "beam",
  reward: "hires",
  chance: 0.01,
  values: {
    setMs: 300, // the emitters taking their places
    scanMs: 1_400, // the sweep down, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
