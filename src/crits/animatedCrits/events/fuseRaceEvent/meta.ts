import type { EventMeta } from "../../eventMeta";

// lit fuses race to bombs on the bars
export default {
  label: "Fuse Race",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    racesMs: [700, 400] as [number, number], // each fuse's race, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
