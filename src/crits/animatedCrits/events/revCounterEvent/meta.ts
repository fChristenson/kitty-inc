import type { EventMeta } from "../../eventMeta";

// a giant rev counter hits the redline
export default {
  label: "Rev Counter",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    dialMs: 400, // the dial sweeping in
    revsMs: [500, 280] as [number, number], // each rev up, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
