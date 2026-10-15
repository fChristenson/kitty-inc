import type { EventMeta } from "../../eventMeta";

// a wisp jellyfish pulses up into the total
export default {
  label: "Jellyfish",
  style: "wisp",
  chance: 0.01,
  values: {
    pulseGapsMs: [380, 220] as [number, number], // between pulses, quickening
    diveMs: 240, // the last dive into the total
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
