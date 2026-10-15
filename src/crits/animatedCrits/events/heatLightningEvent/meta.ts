import type { EventMeta } from "../../eventMeta";

// sheet lightning drops bolts onto empty spots
export default {
  label: "Heat Lightning",
  style: "lightning",
  reward: "hires",
  chance: 0.01,
  values: {
    flickerMs: 600, // the sheet lightning building
    gapsMs: [240, 120] as [number, number], // between drops, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
