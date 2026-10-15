import type { EventMeta } from "../../eventMeta";

// fallers caught on empty spots
export default {
  label: "Trust Fall",
  style: "experiment",
  reward: "hires",
  chance: 0.01,
  values: {
    fallsMs: [220, 130] as [number, number], // between falls, quickening
    fallMs: 360, // each fall
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
