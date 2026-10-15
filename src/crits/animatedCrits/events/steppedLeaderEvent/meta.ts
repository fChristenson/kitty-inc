import type { EventMeta } from "../../eventMeta";

// a stepped leader creeps up to the locked floor
export default {
  label: "Stepped Leader",
  style: "lightning",
  reward: "unlock",
  chance: 0.01,
  values: {
    stepsMs: [180, 70] as [number, number], // each step, quickening
    strokeMs: 400, // the return stroke
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
