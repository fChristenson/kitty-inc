import type { EventMeta } from "../../eventMeta";

// molten cash poured from a crucible into moulds
export default {
  label: "Foundry",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    streamMs: 1_100, // the pour
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
