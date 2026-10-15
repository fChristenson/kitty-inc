import type { EventMeta } from "../../eventMeta";

// a waiter wisp trips and spills a heap of cash over the bars
export default {
  label: "Butterfingers",
  style: "mix",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    pourMs: 350, // heaping up on the tray
    walkMs: 900, // teetering across
    spillMs: 650, // the spill landing
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
