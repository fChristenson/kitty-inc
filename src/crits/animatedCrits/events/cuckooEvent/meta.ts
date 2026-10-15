import type { EventMeta } from "../../eventMeta";

// cuckoo wisps boing out and fly to spots
export default {
  label: "Cuckoo",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    boingsMs: [380, 220] as [number, number],
    flightMs: [380, 260] as [number, number],
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
