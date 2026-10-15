import type { EventMeta } from "../../eventMeta";

// a beam scrawls a trail of cash that runs home
export default {
  label: "Etch",
  style: "beam",
  chance: 0.01,
  values: {
    etchMs: 1_000, // the beam scrawling
    pauseMs: 120, // before the trail runs
    runMs: 650, // the trail running into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
