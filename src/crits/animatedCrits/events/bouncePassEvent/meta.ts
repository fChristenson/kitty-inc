import type { EventMeta } from "../../eventMeta";

// a ball bounce-passed off the floor worker to worker
export default {
  label: "Bounce Pass",
  style: "bounce",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    legMs: [230, 140] as [number, number], // each leg, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
