import type { EventMeta } from "../../eventMeta";

// a paddle smacks a ball on an elastic into the lock till it breaks
export default {
  label: "Paddle Ball",
  style: "bounce",
  reward: "a free floor",
  chance: 0.01,
  values: {
    tripsMs: [520, 260] as [number, number], // each round trip, quickening
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
