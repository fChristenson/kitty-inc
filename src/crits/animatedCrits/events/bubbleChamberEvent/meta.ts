import type { EventMeta } from "../../eventMeta";

// wisps spiral like particle tracks onto the spots
export default {
  label: "Bubble Chamber",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    curlMs: [700, 1500] as [number, number], // the quickest and slowest track
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
