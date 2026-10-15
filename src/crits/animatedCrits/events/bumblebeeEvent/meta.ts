import type { EventMeta } from "../../eventMeta";

// a bee buzzes onto empty spots
export default {
  label: "Bumblebee",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    flightsMs: [420, 220] as [number, number], // each flight, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
