import type { EventMeta } from "../../eventMeta";

// a river climbs a flight of locks beside the bars
export default {
  label: "Canal Locks",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    locksMs: [520, 300] as [number, number], // each lock's fill, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
