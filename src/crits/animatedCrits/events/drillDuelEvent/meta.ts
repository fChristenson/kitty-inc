import type { EventMeta } from "../../eventMeta";

// drills grind head to head, the winner bores into a worker
export default {
  label: "Drill Duel",
  style: "drill",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    approachMs: 220,
    grindsMs: [420, 260] as [number, number], // each grind, quickening
    boreMs: 280, // the winner boring into its worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
