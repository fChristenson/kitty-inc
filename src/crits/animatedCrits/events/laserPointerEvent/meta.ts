import type { EventMeta } from "../../eventMeta";

// wisp kittens chase a laser dot onto the workers
export default {
  label: "Laser Pointer",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    dartsMs: [180, 100] as [number, number], // each dart of the dot, quickening
    holdsMs: [80, 20] as [number, number], // the dot staying on a worker after the pounce
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
