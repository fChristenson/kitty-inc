import type { EventMeta } from "../../eventMeta";

// flyers somersault between trapezes onto spots
export default {
  label: "Trapeze",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    periodMs: 440, // each trapeze's swing
    flingMs: 340,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
