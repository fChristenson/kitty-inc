import type { EventMeta } from "../../eventMeta";

// a rope of cash leaps out of a heap in rising arches
export default {
  label: "Chain Fountain",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    archesMs: [420, 240] as [number, number], // between arches, quickening
    travelMs: [560, 380] as [number, number], // each arch's pour
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
