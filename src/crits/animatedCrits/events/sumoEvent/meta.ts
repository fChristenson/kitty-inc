import type { EventMeta } from "../../eventMeta";

// two wrestlers clash in a ring
export default {
  label: "Sumo",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    clashesMs: [480, 320] as [number, number], // each clash, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
