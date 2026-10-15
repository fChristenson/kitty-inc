import type { EventMeta } from "../../eventMeta";

// mallets smack a puck to a goal
export default {
  label: "Air Hockey",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    shotsMs: [320, 160] as [number, number], // each shot, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
