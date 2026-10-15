import type { EventMeta } from "../../eventMeta";

// a train puffing cash drops workers at each stop
export default {
  label: "Steam Train",
  style: "mix",
  reward: "free hires and cash",
  chance: 0.01,
  values: {
    legsMs: [460, 280] as [number, number], // between stops, quickening
    dwellMs: 120,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
