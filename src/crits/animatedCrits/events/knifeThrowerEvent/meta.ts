import type { EventMeta } from "../../eventMeta";

// shots outline each worker
export default {
  label: "Knife Thrower",
  style: "gunfire",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    shotsMs: [55, 30] as [number, number], // between shots, the first worker to the last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
