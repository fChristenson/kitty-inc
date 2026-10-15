import type { EventMeta } from "../../eventMeta";

// crossfire tracers into bars
export default {
  label: "Tracer Rounds",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    fireMs: 1100, // the crossfire
    levelShare: 0.03, // of a bar's levels, per hit
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
