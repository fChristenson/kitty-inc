import type { EventMeta } from "../../eventMeta";

// a spinning wisp rains cash
export default {
  label: "Rain Dance",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    dancesMs: [460, 300] as [number, number], // each dance, quickening
    hopMs: 160, // the hop to the next spot
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
