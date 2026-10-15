import type { EventMeta } from "../../eventMeta";

// a pusher shoves cash off a ledge
export default {
  label: "Coin Pusher",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    pushesMs: [380, 220] as [number, number], // each push, quickening
    streamMs: 1_300, // the feed pouring
    travelMs: 500, // each coin's trip to the ledge
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
