import type { EventMeta } from "../../eventMeta";

// beams fan out and close like a camera iris
export default {
  label: "Iris",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    fanMs: 300, // the beams fanning out
    stepsMs: [280, 140] as [number, number], // each iris step, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
