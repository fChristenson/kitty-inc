import type { EventMeta } from "../../eventMeta";

// a lens zooms in, cash bursts out
export default {
  label: "Magnifier",
  style: "experiment",
  chance: 0.01,
  values: {
    glideMs: 250, // gliding to each stop
    zoomMs: 300, // zooming in and out at a stop
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
