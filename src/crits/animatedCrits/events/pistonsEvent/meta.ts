import type { EventMeta } from "../../eventMeta";

// bomb cylinders fire in an engine's firing order
export default {
  label: "Pistons",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    firstMs: 200,
    firesMs: [220, 70] as [number, number], // between firings, revving up
    redlineGapMs: 160,
    jetMs: 150,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
