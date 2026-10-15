import type { EventMeta } from "../../eventMeta";

// a wisp paints the air with light
export default {
  label: "Light Painting",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    paintMs: 1_600, // the painting
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
