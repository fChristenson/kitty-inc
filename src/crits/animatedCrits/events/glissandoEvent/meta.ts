import type { EventMeta } from "../../eventMeta";

// strips of the screen play like keys
export default {
  label: "Glissando",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    runsMs: [420, 220] as [number, number], // each run, quickening
    slamMs: 200,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
