import type { EventMeta } from "../../eventMeta";

// fencer wisps duel over each worker, then lunge
export default {
  label: "Fencing",
  style: "wisp",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    staggerMs: 130, // between bouts starting
    boutMs: [320, 200] as [number, number], // between clashes, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
