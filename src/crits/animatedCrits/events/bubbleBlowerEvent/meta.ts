import type { EventMeta } from "../../eventMeta";

// coin bubbles lift each worker
export default {
  label: "Bubble Blower",
  style: "mix",
  reward: "worker perma tiers and cash",
  chance: 0.01,
  values: {
    blowsMs: [420, 240] as [number, number], // each bubble, quickening
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
