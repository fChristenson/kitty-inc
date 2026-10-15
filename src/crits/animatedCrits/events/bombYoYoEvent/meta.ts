import type { EventMeta } from "../../eventMeta";

// a bomb on a string
export default {
  label: "Bomb Yo-Yo",
  style: "explosion",
  reward: "tiers",
  chance: 0.01,
  values: {
    throwsMs: [540, 380] as [number, number], // each throw and yank back
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
