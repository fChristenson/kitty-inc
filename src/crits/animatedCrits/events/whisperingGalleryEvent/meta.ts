import type { EventMeta } from "../../eventMeta";

// a ball banks round an ellipse through its foci, the button and the lock
export default {
  label: "Whispering Gallery",
  style: "bounce",
  reward: "a free floor",
  chance: 0.01,
  values: {
    drawMs: 220, // the ellipse drawing itself
    legsMs: [300, 140] as [number, number], // each chord, quickening
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
