import type { EventMeta } from "../../eventMeta";

// letterbox bars and punch-in zooms
export default {
  label: "Cinematic",
  style: "experiment",
  chance: 0.01,
  values: {
    barsMs: 180, // the bars slamming in
    punchGapsMs: [360, 220] as [number, number], // between punches, quickening
    punchMs: 110, // each zoom punching in
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
