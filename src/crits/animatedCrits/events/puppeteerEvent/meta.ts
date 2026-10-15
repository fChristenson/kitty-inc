import type { EventMeta } from "../../eventMeta";

// strings of cash yank the workers
export default {
  label: "Puppeteer",
  style: "mix",
  reward: "worker tiers + cash",
  chance: 0.01,
  values: {
    riseMs: 300, // rising to the top
    stringMs: 240, // each string letting down
    yanksMs: [260, 130] as [number, number], // between yanks, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
