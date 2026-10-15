import type { EventMeta } from "../../eventMeta";

// a zigzag torrent up
export default {
  label: "Torrent",
  style: "money",
  reward: "a free floor + cash",
  chance: 0.01,
  values: {
    climbMs: 1200, // the torrent's climb to the lock
    holdMs: 500,
    mergeMs: 300,
  },
} as const satisfies EventMeta;
