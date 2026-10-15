import type { EventMeta } from "../../eventMeta";

// a conga line drops dancers onto empty spots
export default {
  label: "Conga Line",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    danceMs: 2_000, // the line dancing its route
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
