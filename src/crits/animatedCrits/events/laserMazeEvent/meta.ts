import type { EventMeta } from "../../eventMeta";

// a wisp threads a maze of beams up to the locked floor
export default {
  label: "Laser Maze",
  style: "beam",
  reward: "unlock",
  chance: 0.01,
  values: {
    runMs: 1_500, // the run, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
