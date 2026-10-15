import type { EventMeta } from "../../eventMeta";

// lightning crawls the sky dropping forks on the bars
export default {
  label: "Anvil Crawler",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    passesMs: [600, 380] as [number, number], // each pass, quickening
    levelShare: 0.05, // of the bar's levels, per fork
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
