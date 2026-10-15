import type { EventMeta } from "../../eventMeta";

// an iris shuts onto each worker
export default {
  label: "Iris Out",
  style: "experiment",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    closeMs: 260, // the iris shutting in
    holdsMs: [380, 220] as [number, number], // on each worker, quickening
    moveMs: 160, // gliding to the next
    openMs: 260, // springing back open
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
