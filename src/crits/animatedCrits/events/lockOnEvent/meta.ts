import type { EventMeta } from "../../eventMeta";

// an aim laser locks on and fires
export default {
  label: "Lock-On",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    huntsMs: [420, 180] as [number, number], // hunting each target, quickening
    fireMs: 120, // each shot
    volleyMs: 260, // every beam blazing at once at the end
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
