import type { EventMeta } from "../../eventMeta";

// beams stab down all over, then the button
export default {
  label: "Ion Storm",
  style: "beam",
  chance: 0.01,
  values: {
    aimMs: 120, // each aim line flickering before its beam
    gapsMs: [220, 70] as [number, number], // between strikes, quickening
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
