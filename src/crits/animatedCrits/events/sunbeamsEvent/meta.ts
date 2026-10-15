import type { EventMeta } from "../../eventMeta";

// sunbeams break through onto the workers
export default {
  label: "Sunbeams",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    aimMs: 400, // the sun rising
    gapsMs: [300, 160] as [number, number], // between beams, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
