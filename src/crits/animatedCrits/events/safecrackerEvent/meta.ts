import type { EventMeta } from "../../eventMeta";

// a dial spun to its combination opens the locked floor
export default {
  label: "Safecracker",
  style: "experiment",
  reward: "unlock",
  chance: 0.01,
  values: {
    spinsMs: [650, 450] as [number, number], // each spin, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
