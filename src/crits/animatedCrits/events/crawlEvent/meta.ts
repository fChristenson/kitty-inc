import type { EventMeta } from "../../eventMeta";

// lightning crawls along the bars
export default {
  label: "Crawl",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    lapsMs: [380, 200] as [number, number], // each crawl, quickening
    levelShare: 0.05, // of the bar's levels, per crawl
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
