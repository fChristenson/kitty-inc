import type { EventMeta } from "../../eventMeta";

// a ring of players kicks a ball round each worker
export default {
  label: "Hacky Sack",
  style: "bounce",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    kicksMs: [150, 95] as [number, number], // each kick, the first worker to the last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
