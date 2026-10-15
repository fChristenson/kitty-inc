import type { EventMeta } from "../../eventMeta";

// wisps bounce on a springy floor, then leap onto empty spots
export default {
  label: "Bouncy Castle",
  style: "bounce",
  reward: "free hires",
  chance: 0.01,
  values: {
    staggerMs: 110, // between wisps dropping in
    hopMs: [240, 360] as [number, number], // each hop, from the first to the leap off
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
