import type { EventMeta } from "../../eventMeta";

// seed wisps twirl down and pop
export default {
  label: "Maple Seeds",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    flingMs: 250, // the seeds flung up
    fallMs: 1_100, // the slowest seed's twirl down
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
