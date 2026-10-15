import type { EventMeta } from "../../eventMeta";

// a gunship rakes the bars with wisp bullets pass after pass
export default {
  label: "Strafing Run",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    passesMs: [420, 260] as [number, number], // each pass, quickening
    turnMs: 140, // each hairpin between passes
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
