import type { EventMeta } from "../../eventMeta";

// packs of wisps shove on each bar until one drives through
export default {
  label: "Scrum",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    staggerMs: 250, // between scrums forming
    shovesMs: [300, 180] as [number, number], // between heaves, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
