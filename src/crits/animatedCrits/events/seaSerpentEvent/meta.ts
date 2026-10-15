import type { EventMeta } from "../../eventMeta";

// a serpent of cash humps across
export default {
  label: "Sea Serpent",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    swimMs: 1200, // the swim across
    breachMs: 420, // the leap into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
