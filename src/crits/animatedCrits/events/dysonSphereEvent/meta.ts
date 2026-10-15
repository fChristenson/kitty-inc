import type { EventMeta } from "../../eventMeta";

// gold panels lock round a sun band by band, then the finished sphere beams
// every bar
export default {
  label: "Dyson Sphere",
  style: "levels + crit tier",
  chance: 0.01,
  values: {
    levelShare: 0.01, // levels per beam
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
