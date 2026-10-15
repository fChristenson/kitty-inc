import type { EventMeta } from "../../eventMeta";

// a bingo card daubed to a full row
export default {
  label: "Bingo",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    spreadMs: 400, // the card spreading
    callsMs: [160, 60] as [number, number], // between calls, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
