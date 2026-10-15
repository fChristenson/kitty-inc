import type { EventMeta } from "../../eventMeta";

// spent casings tinkle into coins
export default {
  label: "Shell Casings",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    shotMs: 120, // between shots at first
    casingMs: 420, // each casing's fall
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
