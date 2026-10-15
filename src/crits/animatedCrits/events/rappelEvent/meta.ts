import type { EventMeta } from "../../eventMeta";

// a gunner rappels down, raking the bars
export default {
  label: "Rappel",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    boundsMs: [450, 300] as [number, number], // each bound, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
