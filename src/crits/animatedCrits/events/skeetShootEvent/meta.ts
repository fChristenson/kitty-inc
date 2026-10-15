import type { EventMeta } from "../../eventMeta";

// clays shot out of the sky
export default {
  label: "Skeet Shoot",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [280, 140] as [number, number], // between clays, quickening
    arcMs: 900, // each clay's arc
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
