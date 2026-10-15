import type { EventMeta } from "../../eventMeta";

// foosball rods kick a ball up the bars
export default {
  label: "Foosball",
  style: "bounce",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    serveMs: 120,
    legsMs: [260, 110] as [number, number], // each kick or bank, quickening
    levelShare: 0.04,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
