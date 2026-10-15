import type { EventMeta } from "../../eventMeta";

// an X of lightning is dragged up onto the locked floor
export default {
  label: "Four Corners",
  style: "lightning",
  reward: "an unlock",
  chance: 0.01,
  values: {
    spreadMs: 300, // the wisps flying to the corners
    cracksMs: [220, 140] as [number, number], // between bolts, quickening
    climbMs: 700, // the X climbing to the floor
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
