import type { EventMeta } from "../../eventMeta";

// a dowsing wisp hunts out empty spots
export default {
  label: "Dowsing",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    findsMs: [450, 260] as [number, number], // each find, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
