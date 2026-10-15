import type { EventMeta } from "../../eventMeta";

// a projector beams spinning wireframes that turn into new workers
export default {
  label: "Hologram",
  style: "beam",
  reward: "free hires",
  chance: 0.01,
  values: {
    buildMs: 380, // each wireframe building up
    gapMs: 200, // between wireframes
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
