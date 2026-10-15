import type { EventMeta } from "../../eventMeta";

// bombs drift down under glitter canopies onto the empty spots
export default {
  label: "Paradrop",
  style: "explosion",
  reward: "free hires",
  chance: 0.01,
  values: {
    dropMs: 700,
    gapsMs: [300, 130] as [number, number], // between drops, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
