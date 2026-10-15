import type { EventMeta } from "../../eventMeta";

// crossing shockwave rings set off chains of blasts
export default {
  label: "Interference",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    blowsMs: [420, 580, 740] as [number, number, number], // each bomb going off
    ringMs: 1000, // from the last bomb to the rings closing
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
