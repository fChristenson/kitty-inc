import type { EventMeta } from "../../eventMeta";

// a cloud of coins dances into Chladni plate figures as a tone climbs
export default {
  label: "Chladni",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    toneMs: 420, // each figure
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
