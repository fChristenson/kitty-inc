import type { EventMeta } from "../../eventMeta";

// a spool unspools and reels in a river
export default {
  label: "Spool",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    unspoolMs: 700, // unspooling
    reelMs: 420, // reeling back in
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
