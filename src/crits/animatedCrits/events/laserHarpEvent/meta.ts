import type { EventMeta } from "../../eventMeta";

// a wisp plucks laser strings
export default {
  label: "Laser Harp",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    igniteMs: 300, // the strings shooting up
    entryMs: 220, // the wisp swooping in
    gapsMs: [170, 70] as [number, number], // between plucks, quickening
    finaleMs: 300, // every string blazing at once
    levelShare: 0.05, // of a bar's levels, per pluck
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
