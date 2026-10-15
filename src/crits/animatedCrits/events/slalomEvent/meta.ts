import type { EventMeta } from "../../eventMeta";

// the wisp carves round gates down to the button
export default {
  label: "Slalom",
  chance: 0.01,
  values: {
    gateMs: [320, 170] as [number, number], // each turn, quickening
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
