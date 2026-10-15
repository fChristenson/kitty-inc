import type { EventMeta } from "../../eventMeta";

// recruits dash through crossfire
export default {
  label: "Covering Fire",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    gapMs: [210, 130] as [number, number], // between recruits, quickening
    dashMs: 560, // each dash, cover to cover
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
