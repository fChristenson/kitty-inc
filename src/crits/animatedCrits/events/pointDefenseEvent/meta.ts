import type { EventMeta } from "../../eventMeta";

// a turret shoots down wisps over the workers
export default {
  label: "Point Defense",
  style: "gunfire",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    gapsMs: [260, 140] as [number, number], // between kills, quickening
    fallMs: 550, // each wisp's fall
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
