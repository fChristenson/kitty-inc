import type { EventMeta } from "../../eventMeta";

// a wisp surfs geysers into the bars
export default {
  label: "Geyser Rider",
  style: "mix",
  reward: "crit tiers and cash",
  chance: 0.01,
  values: {
    eruptsMs: [420, 240] as [number, number], // between geysers, quickening
    riseMs: 420,
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
