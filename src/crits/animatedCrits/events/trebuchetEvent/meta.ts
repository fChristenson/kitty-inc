import type { EventMeta } from "../../eventMeta";

// a trebuchet flings bombs into the locked floor
export default {
  label: "Trebuchet",
  style: "explosion",
  reward: "unlock",
  chance: 0.01,
  values: {
    throwsMs: [700, 500] as [number, number], // each throw, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
