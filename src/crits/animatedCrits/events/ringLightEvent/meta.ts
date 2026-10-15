import type { EventMeta } from "../../eventMeta";

// a hoop of beams drops down the screen
export default {
  label: "Ring Light",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    formMs: 320, // the hoop forming
    dropMs: 1000, // its drop down the screen
    cinchMs: 260, // cinching to a point
    levelShare: 0.06, // of a bar's levels, as the hoop passes it
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
