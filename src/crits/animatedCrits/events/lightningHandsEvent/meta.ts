import type { EventMeta } from "../../eventMeta";

// a sorcerer pours lightning onto each bar
export default {
  label: "Lightning Hands",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    streamsMs: [420, 260] as [number, number], // each stream, shorter each time
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
