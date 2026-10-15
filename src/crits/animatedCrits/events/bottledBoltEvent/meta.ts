import type { EventMeta } from "../../eventMeta";

// trapped lightning bursts out onto the bars
export default {
  label: "Bottled Bolt",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    trapMs: 1_100, // bolts rattling in the bottle
    releasesMs: [380, 240] as [number, number], // between releases, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
