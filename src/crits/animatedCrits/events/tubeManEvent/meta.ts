import type { EventMeta } from "../../eventMeta";

// an inflatable tube man slaps each worker
export default {
  label: "Tube Man",
  style: "wisp",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    riseMs: 300,
    slapsMs: [420, 240] as [number, number], // each flop and spring back, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
