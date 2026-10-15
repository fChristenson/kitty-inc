import type { EventMeta } from "../../eventMeta";

// a snaking stream into the lock
export default {
  label: "Bullet Snake",
  style: "gunfire",
  reward: "unlock",
  chance: 0.01,
  values: {
    fireMs: 1100, // the stream
    flightMs: 420, // each round's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
