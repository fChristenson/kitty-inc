import type { EventMeta } from "../../eventMeta";

// curving fibers of light carry pulses onto empty spots
export default {
  label: "Fiber Optic",
  style: "beam",
  reward: "hires",
  chance: 0.01,
  values: {
    gapsMs: [260, 130] as [number, number], // between fibers, quickening
    fiberMs: 400, // each pulse's run
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
