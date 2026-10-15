import type { EventMeta } from "../../eventMeta";

// the screen rolls like a TV losing vertical hold
export default {
  label: "Vertical Hold",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    slipMs: 250, // jittering before it rolls
    rollsMs: [380, 150] as [number, number], // each roll, quickening
    lockMs: 260, // the last part-roll back into place
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
