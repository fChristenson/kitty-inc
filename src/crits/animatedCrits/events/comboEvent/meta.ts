import type { EventMeta } from "../../eventMeta";

// a combo of jabs on the clicked bar
export default {
  label: "Combo",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    jabMs: 120, // each jab's dart in
    hitsMs: [200, 80] as [number, number], // between hits, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
