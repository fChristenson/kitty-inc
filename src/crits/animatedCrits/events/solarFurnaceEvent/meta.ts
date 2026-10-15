import type { EventMeta } from "../../eventMeta";

// mirrors bounce sunbeams onto the lock
export default {
  label: "Solar Furnace",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    appearMs: 200,
    mirrorsMs: [200, 80] as [number, number], // between mirrors joining, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
