import type { EventMeta } from "../../eventMeta";

// four nozzles whirl round the clicked bar spraying it gold
export default {
  label: "Gold Plating",
  style: "spray",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    flyMs: 260, // the nozzles flying out to their ring
    sprayMs: 1500, // whirling and spraying, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
