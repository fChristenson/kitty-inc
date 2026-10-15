import type { EventMeta } from "../../eventMeta";

// beams project new workers
export default {
  label: "Projector",
  style: "beam",
  reward: "free hires",
  chance: 0.01,
  values: {
    riseMs: 300, // the lens rising off the button
    aimMs: 150, // each aim laser
    beamsMs: [340, 180] as [number, number], // each projection, quickening
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
