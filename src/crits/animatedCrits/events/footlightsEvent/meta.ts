import type { EventMeta } from "../../eventMeta";

// footlights fire on workers
export default {
  label: "Footlights",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    cuesMs: [440, 280] as [number, number], // each cue, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
