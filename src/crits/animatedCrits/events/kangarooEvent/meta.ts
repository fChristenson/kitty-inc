import type { EventMeta } from "../../eventMeta";

// a kangaroo bounds up to the lock
export default {
  label: "Kangaroo",
  style: "wisp",
  reward: "unlock",
  chance: 0.01,
  values: {
    hopsMs: [300, 380] as [number, number], // each hop, ever bigger
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
