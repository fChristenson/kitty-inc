import type { EventMeta } from "../../eventMeta";

// bubbles blown until they pop
export default {
  label: "Bubble Gum",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    blowMs: [420, 600] as [number, number], // each bubble, ever bigger
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
