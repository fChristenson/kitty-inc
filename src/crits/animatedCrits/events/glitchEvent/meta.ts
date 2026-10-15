import type { EventMeta } from "../../eventMeta";

// the screen glitches, then reboots
export default {
  label: "Glitch",
  style: "experiment",
  chance: 0.01,
  values: {
    gapsMs: [260, 70] as [number, number], // between glitches, quickening
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
