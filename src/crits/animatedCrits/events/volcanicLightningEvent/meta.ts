import type { EventMeta } from "../../eventMeta";

// bolts leap out of an ash plume onto the bars
export default {
  label: "Volcanic Lightning",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    eruptMs: 380, // the plume billowing up
    boltsMs: [300, 180] as [number, number], // between bolts, quickening
    levelShare: 0.06, // of a bar's levels, per bolt
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
