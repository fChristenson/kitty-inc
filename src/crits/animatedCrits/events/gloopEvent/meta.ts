import type { EventMeta } from "../../eventMeta";

// bubbles swell in a pool of cash and burst onto the bars
export default {
  label: "Gloop",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    swellsMs: [520, 320] as [number, number], // each bubble swelling, quickening
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
