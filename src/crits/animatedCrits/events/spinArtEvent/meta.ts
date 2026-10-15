import type { EventMeta } from "../../eventMeta";

// a whirl flings streaks of cash onto the workers
export default {
  label: "Spin Art",
  style: "mix",
  reward: "worker perma tiers and cash",
  chance: 0.01,
  values: {
    feedMs: 400, // the river reaching the whirl
    flingsMs: [300, 160] as [number, number], // between flings, quickening
    flightMs: 320,
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
