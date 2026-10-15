import type { EventMeta } from "../../eventMeta";

// a mallet fires a puck up to ring the bell
export default {
  label: "High Striker",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    strikesMs: [550, 700] as [number, number], // each strike, flying higher
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
