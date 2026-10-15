import type { EventMeta } from "../../eventMeta";

// the button shoots an arcade centipede apart segment by segment, each
// dropping onto a worker
export default {
  label: "Centipede",
  style: "gunfire",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    crawlMs: 2000, // the centipede's crawl down its rows
    dropMs: 320, // each shot segment's drop onto its worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
