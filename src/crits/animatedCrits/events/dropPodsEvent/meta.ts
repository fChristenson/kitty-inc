import type { EventMeta } from "../../eventMeta";

// bomb pods slam down onto empty spots
export default {
  label: "Drop Pods",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    gapsMs: [260, 130] as [number, number], // between pods, quickening
    fallMs: 450, // each pod's fall
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
