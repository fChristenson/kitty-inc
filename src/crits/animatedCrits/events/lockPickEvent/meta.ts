import type { EventMeta } from "../../eventMeta";

// a pick beam pushes up the lock's pins one by one
export default {
  label: "Lock Pick",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    pinsMs: [300, 160] as [number, number], // each pin, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
