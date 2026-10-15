import type { EventMeta } from "../../eventMeta";

// a twirling baton lands on the bars
export default {
  label: "Majorette",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    throwsMs: [650, 420] as [number, number], // each throw, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
