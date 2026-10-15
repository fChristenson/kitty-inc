import type { EventMeta } from "../../eventMeta";

// a wheel of wisps cartwheels across the screen
export default {
  label: "Cartwheel",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    hopsMs: [320, 180] as [number, number], // each hop, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
