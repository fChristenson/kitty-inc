import type { EventMeta } from "../../eventMeta";

// spinning tops battle over each bar, the winner landing on it
export default {
  label: "Battle Tops",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    staggerMs: 260, // between battles starting
    clashesMs: [280, 170] as [number, number], // between clashes, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
