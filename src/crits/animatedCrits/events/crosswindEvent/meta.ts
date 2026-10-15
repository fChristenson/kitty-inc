import type { EventMeta } from "../../eventMeta";

// gusts squeeze a spiral of glitter into a column, then a heap
export default {
  label: "Crosswind",
  style: "clutter",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    spillMs: 320, // the glitter blown out over the screen
    gustMs: 280, // each gust (5)
    gapMs: 60, // between gusts
    gatherMs: 150, // the heap settling
    flyMs: 300, // each bit's flight onto its worker
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
