import type { EventMeta } from "../../eventMeta";

// spark plugs fire in order, revving to the redline
export default {
  label: "Redline",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    firesMs: [170, 40] as [number, number], // between sparks, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
