import type { EventMeta } from "../../eventMeta";

// a pen wisp draws a giant glitter heart, which beats and bursts onto the
// workers
export default {
  label: "Sweetheart",
  style: "drawing",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    drawMs: 1300, // the pen drawing the heart, quickening
    burstMs: 400, // each shower's arc onto its worker
    gapMs: 90, // between showers
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
