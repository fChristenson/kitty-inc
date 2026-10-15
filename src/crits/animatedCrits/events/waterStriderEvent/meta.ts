import type { EventMeta } from "../../eventMeta";

// darting glides that ripple coins
export default {
  label: "Water Strider",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    glidesMs: [260, 110] as [number, number], // each glide, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
