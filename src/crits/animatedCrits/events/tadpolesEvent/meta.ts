import type { EventMeta } from "../../eventMeta";

// a mother wisp lays tadpoles that wriggle onto empty spots
export default {
  label: "Tadpoles",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    swimMs: 300, // the mother swimming out
    gapsMs: [260, 130] as [number, number], // between tadpoles, quickening
    wriggleMs: 550, // each tadpole's wriggle
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
