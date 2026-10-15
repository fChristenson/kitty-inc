import type { EventMeta } from "../../eventMeta";

// buried mines bounce up and burst into cash
export default {
  label: "Bouncing Betty",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    buryMs: 400, // the mines buried
    minesMs: [260, 120] as [number, number], // between mines, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
