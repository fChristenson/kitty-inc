import type { EventMeta } from "../../eventMeta";

// a stork drops bundles onto empty spots
export default {
  label: "Stork",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    flyMs: 1300, // the stork's flight across the screen
    dropMs: 380, // each bundle's fall
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
