import type { EventMeta } from "../../eventMeta";

// cages of light slam shut on the workers
export default {
  label: "Light Cage",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    closesMs: [380, 220] as [number, number], // each cage closing, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
