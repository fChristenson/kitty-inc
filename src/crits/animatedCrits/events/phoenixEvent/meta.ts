import type { EventMeta } from "../../eventMeta";

// a firebird bursts on each bar and is reborn
export default {
  label: "Phoenix",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    swoopsMs: [380, 220] as [number, number], // each dive, quickening
    reformMs: 300, // embers flung out and back
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
