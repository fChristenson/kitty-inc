import type { EventMeta } from "../../eventMeta";

// a metronome beam ticks across the bars
export default {
  label: "Metronome",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    ticksMs: [380, 190] as [number, number], // each swing, quickening
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
