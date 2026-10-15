import type { EventMeta } from "../../eventMeta";

// the screen rolls up like a blind
export default {
  label: "Roll Up",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    rollMs: 900,
    hangMs: 300,
    snapMs: 200,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
