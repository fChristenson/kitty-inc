import type { EventMeta } from "../../eventMeta";

// a line of guns rains volleys on the bars
export default {
  label: "Hailfire",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    spreadMs: 400, // the guns spreading out
    volleysMs: [380, 200] as [number, number], // between volleys, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
