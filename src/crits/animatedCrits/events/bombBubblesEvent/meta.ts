import type { EventMeta } from "../../eventMeta";

// bubbled bombs blow under the bars
export default {
  label: "Bomb Bubbles",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    riseMs: 320, // each bubble's rise
    barsMs: [360, 240] as [number, number], // between bars, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
