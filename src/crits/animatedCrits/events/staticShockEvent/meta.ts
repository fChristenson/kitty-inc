import type { EventMeta } from "../../eventMeta";

// a charged wisp zaps the workers
export default {
  label: "Static Shock",
  style: "lightning",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    scuffMs: 700, // charging up
    dartsMs: [300, 160] as [number, number], // each dart to a worker, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
