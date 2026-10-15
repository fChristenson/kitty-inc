import type { EventMeta } from "../../eventMeta";

// six beams converge on spot after spot
export default {
  label: "Pinpoint",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    shotsMs: [300, 130] as [number, number], // each volley, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
