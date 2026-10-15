import type { EventMeta } from "../../eventMeta";

// the screen tiled into a wall of copies of itself
export default {
  label: "Video Wall",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    beatsMs: [120, 420, 680, 900], // each punch out to a bigger wall
    zoomMs: 280, // the button's screen zooming back to fill the view
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
