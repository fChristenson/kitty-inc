import type { EventMeta } from "../../eventMeta";

// a wisp spins donuts round the bars
export default {
  label: "Donuts",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    spinsMs: [420, 250] as [number, number], // each set of donuts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
