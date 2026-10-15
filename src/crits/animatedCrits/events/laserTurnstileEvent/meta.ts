import type { EventMeta } from "../../eventMeta";

// a spinning cross of beams
export default {
  label: "Laser Turnstile",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    spinMs: 1500, // the spin, quickening
    levelShare: 0.03, // of a bar's levels, per sweep
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
