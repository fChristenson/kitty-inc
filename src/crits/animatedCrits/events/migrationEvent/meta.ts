import type { EventMeta } from "../../eventMeta";

// a V of wisps drops hires
export default {
  label: "Migration",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    crossMs: 2_000, // the flock crossing the screen
    firstPeelMs: 500, // the first bird peeling off
    peelGapsMs: [380, 220] as [number, number], // between peels, quickening
    diveMs: 320, // each bird's swoop onto its spot
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
