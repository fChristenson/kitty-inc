import type { EventMeta } from "../../eventMeta";

// pillars of light slam onto the workers
export default {
  label: "Pillars",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    aimsMs: [240, 120] as [number, number], // each aim before its slam, quickening
    dropMs: 90, // each pillar thumping down
    blazeMs: 400, // every pillar widening together
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
