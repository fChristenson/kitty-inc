import type { EventMeta } from "../../eventMeta";

// the screen peels like a sticker
export default {
  label: "Sticker Peel",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    peelMs: 900,
    snapMs: 220, // snapping back flat
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
