import type { EventMeta } from "../../eventMeta";

// a swarm snaps between two poles
export default {
  label: "Polarity",
  style: "wisp",
  chance: 0.01,
  values: {
    gatherMs: 320, // the swarm gathering on the first pole
    flipGapsMs: [360, 150] as [number, number], // between flips, quickening
    dashMs: 130, // the swarm's dash across
    slamMs: 200, // the poles slamming together
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
