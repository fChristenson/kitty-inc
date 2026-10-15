import type { EventMeta } from "../../eventMeta";

// the wisp blinks from spot to spot, then the total
export default {
  label: "Wormhole",
  chance: 0.01,
  values: {
    jumpMs: [260, 120] as [number, number], // each dart before it blinks out
    finalMs: 220, // shooting up into the total
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
