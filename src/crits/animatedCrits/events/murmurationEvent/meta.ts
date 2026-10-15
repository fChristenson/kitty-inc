import type { EventMeta } from "../../eventMeta";

// a flock of wisps swirls like starlings, then dives onto empty spots
export default {
  label: "Murmuration",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    flockMs: 1200, // the flock swirling
    diveMs: 380, // each stream's dive
    gapMs: 130, // between streams peeling off
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
