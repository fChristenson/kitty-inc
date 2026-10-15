import type { EventMeta } from "../../eventMeta";

// a wisp rams the locked floor
export default {
  label: "Battering Ram",
  style: "wisp",
  reward: "an unlock",
  chance: 0.01,
  values: {
    swoopMs: 350, // swooping in under the floor
    drawsMs: [320, 200] as [number, number], // each draw-back, quickening
    strikeMs: 110, // each ram up into the floor
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
