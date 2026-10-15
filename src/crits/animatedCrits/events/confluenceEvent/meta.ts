import type { EventMeta } from "../../eventMeta";

// rivers pour in and merge into one into the total
export default {
  label: "Confluence",
  chance: 0.01,
  values: {
    staggerMs: 150, // between rivers starting to pour
    pourMs: 900, // how long each pours
    travelMs: 800, // each coin's trip down its river and up the trunk
  },
} as const satisfies EventMeta;
