import type { EventMeta } from "../../eventMeta";

// guns crisscross each bar
export default {
  label: "Crisscross",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    passesMs: [560, 340] as [number, number], // each pass, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
