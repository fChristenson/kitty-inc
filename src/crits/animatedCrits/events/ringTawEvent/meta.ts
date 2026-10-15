import type { EventMeta } from "../../eventMeta";

// marbles knocked out of a ring bank onto the spots
export default {
  label: "Ring Taw",
  style: "bounce",
  reward: "free hires",
  chance: 0.01,
  values: {
    firstMs: 250,
    flicksMs: [340, 200] as [number, number], // between flicks, quickening
    shotMs: 140,
    rollMs: 260, // each leg of a marble's run to its spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
