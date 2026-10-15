import type { EventMeta } from "../../eventMeta";

// bolts arc between scattered wisps
export default {
  label: "Arc Flash",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    scatterMs: 300, // the wisps scattering
    arcsMs: 1_300, // the arcs, ever thicker
    finalGapMs: 200, // before every wisp arcs to the middle
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
