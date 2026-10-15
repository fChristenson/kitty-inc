import type { EventMeta } from "../../eventMeta";

// the screen pixelates, then snaps back
export default {
  label: "Pixelate",
  style: "experiment",
  chance: 0.01,
  values: {
    gapsMs: [340, 170] as [number, number], // between beats, quickening
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
