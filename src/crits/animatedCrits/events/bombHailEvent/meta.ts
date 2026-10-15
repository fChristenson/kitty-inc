import type { EventMeta } from "../../eventMeta";

// volleys of falling bombs
export default {
  label: "Bomb Hail",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    hailMs: 1200, // first volley to last
    fallMs: 360, // each bomb's fall
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
