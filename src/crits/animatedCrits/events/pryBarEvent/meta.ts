import type { EventMeta } from "../../eventMeta";

// a lever of light pries the lock open
export default {
  label: "Pry Bar",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    pumpsMs: [420, 240] as [number, number], // each pump, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
