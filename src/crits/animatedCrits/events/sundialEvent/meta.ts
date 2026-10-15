import type { EventMeta } from "../../eventMeta";

// a sun arcs over the button and its beam sweeps round like a sundial's
// shadow
export default {
  label: "Sundial",
  style: "beam",
  reward: "worker perma",
  chance: 0.01,
  values: {
    riseMs: 300, // the sun rising
    sweepMs: 1500, // its beam sweeping round
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
