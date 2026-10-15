import type { EventMeta } from "../../eventMeta";

// bands of the screen pop up like a book
export default {
  label: "Pop-Up",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    popsMs: [220, 90] as [number, number], // between pops, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
