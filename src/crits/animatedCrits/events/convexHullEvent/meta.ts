import type { EventMeta } from "../../eventMeta";

// a band gift-wraps scattered pins, then snaps in and scoops them into the
// total
export default {
  label: "Convex Hull",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    pinMs: 300, // the pins popping up
    wrapMs: [220, 90] as [number, number], // each wrapping step, quickening
    snapMs: 360, // the band snapping in
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
