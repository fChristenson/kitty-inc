import type { EventMeta } from "../../eventMeta";

// a sun throws arching flares
export default {
  label: "Solar Flare",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    riseMs: 280, // the sun rising into place
    flaresMs: [260, 140] as [number, number], // between flares, quickening
    arcMs: 260, // each arch reaching out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
